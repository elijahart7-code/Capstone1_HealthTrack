import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value) {
  return value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
const validToken = (token) => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

export function passwordError(password) {
  if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return "Use at least 12 characters and no more than 72 UTF-8 bytes for your password.";
  }
  return null;
}

export function createAccountSetupService({ sql, sendVerificationEmail, assertMailConfigured }) {
  return {
    async initiate(email) {
      assertMailConfigured();
      const token = randomBytes(32).toString("hex");
      const hash = tokenHash(token);
      // This endpoint only activates patient accounts already provisioned by
      // staff. It never overwrites a verified account or creates public users.
      const users = await sql`
        UPDATE users u SET verification_token = ${hash},
          token_expires_at = NOW() + INTERVAL '15 minutes',
          verification_sent_at = NOW(), updated_at = NOW()
        WHERE LOWER(u.email) = ${normalizeEmail(email)} AND u.role = 'patient'
          AND u.is_verified = FALSE
          AND (u.verification_sent_at IS NULL OR u.verification_sent_at < NOW() - INTERVAL '60 seconds')
          AND EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.user_id AND p.archived_at IS NULL)
        RETURNING u.user_id, u.email
      `;
      if (!users.length) return false;
      try {
        await sendVerificationEmail(users[0].email, token);
      } catch (error) {
        // Do not invalidate a newer token if another request already replaced it.
        await sql`
          UPDATE users SET verification_token = NULL, token_expires_at = NULL,
            verification_sent_at = NULL
          WHERE user_id = ${users[0].user_id} AND verification_token = ${hash}
        `;
        throw error;
      }
      return true;
    },

    async complete(token, password) {
      if (!validToken(token)) return null;
      const hash = tokenHash(token);
      const eligible = await sql`
        SELECT user_id FROM users u WHERE verification_token = ${hash}
          AND token_expires_at > NOW() AND is_verified = FALSE AND role = 'patient'
          AND EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.user_id AND p.archived_at IS NULL)
      `;
      if (!eligible.length) return null;
      const passwordHash = await bcrypt.hash(password, 12);
      // Check expiry and consume the token in the same write. Concurrent POSTs
      // cannot both succeed, even after both passed the preliminary lookup.
      const users = await sql`
        UPDATE users u SET password = ${passwordHash}, is_verified = TRUE,
          verification_token = NULL, token_expires_at = NULL,
          verification_sent_at = NULL, updated_at = NOW()
        WHERE user_id = ${eligible[0].user_id} AND verification_token = ${hash}
          AND token_expires_at > NOW() AND is_verified = FALSE AND role = 'patient'
          AND EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.user_id AND p.archived_at IS NULL)
        RETURNING user_id, name, email, role
      `;
      return users[0] || null;
    },
  };
}
