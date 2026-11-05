import bcrypt from "bcryptjs";
import { sql } from "../../config/db.js";
import { accountSetup } from "../../services/accountSetup.js";
import { isValidEmail, normalizeEmail, passwordError } from "../../services/accountSetup.service.js";
import { sessionForUser } from "../../utils/session.js";

export async function login(req, res) {
  const { password, accountType } = req.body || {};
  const email = normalizeEmail(req.body?.email);
  if (!email || typeof password !== "string" || !password || !["patient", "health_worker", "admin"].includes(accountType)) {
    return res.status(422).json({ error: "Choose a valid account type and enter your email and password." });
  }
  const rows = await sql`
    SELECT user_id, name, email, password, role, is_verified
    FROM users WHERE LOWER(email) = ${email}
  `;
  const user = rows[0];
  if (!user || user.role !== accountType || !user.is_verified || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Those credentials don't match an active account. If you are a new patient, confirm your email and set your password first." });
  }
  return res.json({ message: "Logged in.", ...sessionForUser(user) });
}

export async function initiateAccount(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) return res.status(422).json({ error: "Enter a valid email address." });
  res.set("Cache-Control", "no-store");
  try {
    await accountSetup.initiate(email);
    // Same response for unknown, already verified, and recently emailed users.
    return res.status(202).json({ message: "If this email belongs to a pending patient account, a setup link will arrive shortly. Check your inbox and spam folder. Links expire after 15 minutes; wait one minute before requesting another." });
  } catch (error) {
    console.error("[mail] Account setup request failed:", error.code || error.name);
    return res.status(503).json({ error: "We could not send the setup email. Please try again later or contact your health center." });
  }
}

export async function completeAccount(req, res) {
  res.set("Cache-Control", "no-store");
  const { token, new_password } = req.body || {};
  const error = passwordError(new_password);
  if (error) return res.status(422).json({ error });
  const user = await accountSetup.complete(token, new_password);
  if (!user) return res.status(400).json({ error: "This setup link is invalid, expired, or has already been used. Request a new link to continue." });
  return res.json({ message: "Email confirmed and password saved.", ...sessionForUser(user) });
}
