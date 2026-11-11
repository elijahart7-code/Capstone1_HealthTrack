import { createHash, randomInt } from "node:crypto";

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const codeHash = (code) => createHash("sha256").update(code).digest("hex");
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

export function isValidOtpFormat(code) {
  return typeof code === "string" && /^\d{6}$/.test(code);
}

export function createLoginOtpService({ sql, sendLoginCodeEmail, assertMailConfigured }) {
  async function eligibleUser(email) {
    const rows = await sql`
      SELECT u.user_id, u.email, u.login_otp_hash, u.login_otp_expires_at,
        u.login_otp_attempts, u.login_otp_sent_at
      FROM users u
      WHERE LOWER(u.email) = ${normalizeEmail(email)} AND u.role = 'patient'
        AND u.is_verified = TRUE
        AND EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.user_id AND p.archived_at IS NULL)
    `;
    return rows[0] || null;
  }

  async function clearOtp(userId, expectedHash = null) {
    if (expectedHash) {
      await sql`
        UPDATE users SET login_otp_hash = NULL, login_otp_expires_at = NULL,
          login_otp_attempts = 0, login_otp_sent_at = NULL, updated_at = NOW()
        WHERE user_id = ${userId} AND login_otp_hash = ${expectedHash}
      `;
    } else {
      await sql`
        UPDATE users SET login_otp_hash = NULL, login_otp_expires_at = NULL,
          login_otp_attempts = 0, login_otp_sent_at = NULL, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }
  }

  return {
    async request(email) {
      assertMailConfigured();
      const normalized = normalizeEmail(email);
      const existing = await eligibleUser(normalized);
      if (!existing) return { status: "not_eligible" };
      // 60-second resend cooldown: keep the current code valid instead of spamming.
      if (
        existing.login_otp_hash &&
        existing.login_otp_sent_at &&
        existing.login_otp_expires_at &&
        new Date(existing.login_otp_expires_at).getTime() > Date.now() &&
        new Date(existing.login_otp_sent_at).getTime() > Date.now() - OTP_COOLDOWN_SECONDS * 1000
      ) {
        const remaining = Math.max(
          1,
          Math.ceil((new Date(existing.login_otp_expires_at).getTime() - Date.now()) / 1000)
        );
        return { status: "cooldown", email: existing.email, expiresInSeconds: remaining };
      }
      const code = String(randomInt(100000, 1000000));
      const hash = codeHash(code);
      await sql`
        UPDATE users SET login_otp_hash = ${hash},
          login_otp_expires_at = NOW() + INTERVAL '5 minutes',
          login_otp_attempts = 0,
          login_otp_sent_at = NOW(), updated_at = NOW()
        WHERE user_id = ${existing.user_id}
      `;
      try {
        await sendLoginCodeEmail(existing.email, code);
      } catch (error) {
        await clearOtp(existing.user_id, hash);
        throw error;
      }
      return { status: "sent", email: existing.email, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
    },

    async resend(email) {
      assertMailConfigured();
      const normalized = normalizeEmail(email);
      const existing = await eligibleUser(normalized);
      if (!existing || !existing.login_otp_hash) return { status: "no_pending" };
      if (
        existing.login_otp_sent_at &&
        new Date(existing.login_otp_sent_at).getTime() > Date.now() - OTP_COOLDOWN_SECONDS * 1000 &&
        existing.login_otp_expires_at &&
        new Date(existing.login_otp_expires_at).getTime() > Date.now()
      ) {
        return { status: "cooldown", email: existing.email };
      }
      // Expired challenge: issue a fresh code through the same path.
      return this.request(normalized);
    },

    async verify(email, code) {
      if (!isValidOtpFormat(code)) return { status: "invalid_format" };
      const normalized = normalizeEmail(email);
      const hash = codeHash(code);
      // Atomic success path: expiry, attempt cap, verification, and active
      // patient record are all rechecked in the same write.
      const users = await sql`
        UPDATE users u SET login_otp_hash = NULL, login_otp_expires_at = NULL,
          login_otp_attempts = 0, login_otp_sent_at = NULL, updated_at = NOW()
        WHERE LOWER(u.email) = ${normalized} AND u.login_otp_hash = ${hash}
          AND u.login_otp_expires_at > NOW() AND u.login_otp_attempts < ${OTP_MAX_ATTEMPTS}
          AND u.role = 'patient' AND u.is_verified = TRUE
          AND EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.user_id AND p.archived_at IS NULL)
        RETURNING u.user_id, u.name, u.email, u.role
      `;
      if (users.length) return { status: "verified", user: users[0] };
      const pending = await eligibleUser(normalized);
      if (!pending || !pending.login_otp_hash) return { status: "invalid" };
      if (!pending.login_otp_expires_at || new Date(pending.login_otp_expires_at).getTime() <= Date.now()) {
        await clearOtp(pending.user_id);
        return { status: "expired" };
      }
      if ((pending.login_otp_attempts || 0) >= OTP_MAX_ATTEMPTS) {
        await clearOtp(pending.user_id);
        return { status: "locked" };
      }
      const bumped = await sql`
        UPDATE users SET login_otp_attempts = login_otp_attempts + 1, updated_at = NOW()
        WHERE user_id = ${pending.user_id}
        RETURNING login_otp_attempts
      `;
      const attempts = bumped[0]?.login_otp_attempts ?? OTP_MAX_ATTEMPTS;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await clearOtp(pending.user_id);
        return { status: "locked" };
      }
      return { status: "invalid", attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
    },
  };
}
