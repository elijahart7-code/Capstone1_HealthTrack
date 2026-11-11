import bcrypt from "bcryptjs";
import { sql } from "../../config/db.js";
import { accountSetup } from "../../services/accountSetup.js";
import { loginOtp } from "../../services/loginOtp.js";
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
    return res.status(401).json({ error: "Those credentials doesn't match an active account." });
  }
  // Staff keep single-step login. Patients must finish email OTP every sign-in.
  if (user.role !== "patient") {
    return res.json({ message: "Logged in.", ...sessionForUser(user) });
  }
  res.set("Cache-Control", "no-store");
  try {
    const challenge = await loginOtp.request(email);
    if (challenge.status === "not_eligible") {
      return res.status(401).json({ error: "Those credentials doesn't match an active account." });
    }
    if (challenge.status === "cooldown") {
      return res.json({
        requires2FA: true,
        email: challenge.email,
        expiresInSeconds: challenge.expiresInSeconds,
        message: "A sign-in code was already sent. Check your inbox and spam folder. Codes expire after 5 minutes; wait one minute before requesting another.",
      });
    }
    return res.json({
      requires2FA: true,
      email: challenge.email,
      expiresInSeconds: challenge.expiresInSeconds,
      message: "We sent a 6-digit sign-in code to your email. Enter it to finish logging in. It expires in 5 minutes.",
    });
  } catch (error) {
    console.error("[mail] Login code request failed:", error.code || error.name);
    return res.status(503).json({ error: "We could not send the sign-in code. Please try again later or contact your health center." });
  }
}

export async function verifyLoginCode(req, res) {
  res.set("Cache-Control", "no-store");
  const email = normalizeEmail(req.body?.email);
  const { code } = req.body || {};
  if (!isValidEmail(email)) return res.status(422).json({ error: "Enter a valid email address." });
  if (typeof code !== "string" || !code.trim()) return res.status(422).json({ error: "Enter the 6-digit code from your email." });
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return res.status(422).json({ error: "Codes are 6 digits. Check your email and try again." });
  const result = await loginOtp.verify(email, trimmed);
  if (result.status === "verified") {
    return res.json({ message: "Verified.", ...sessionForUser(result.user) });
  }
  if (result.status === "expired") {
    return res.status(400).json({ error: "This code expired. Please sign in again to get a new code." });
  }
  if (result.status === "locked") {
    return res.status(429).json({ error: "Too many incorrect codes. Please sign in again to get a new code." });
  }
  return res.status(401).json({
    error: result.attemptsLeft
      ? `That code is incorrect. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left before a new sign-in is required.`
      : "That code is incorrect. Check your email and try again.",
  });
}

export async function resendLoginCode(req, res) {
  res.set("Cache-Control", "no-store");
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) return res.status(422).json({ error: "Enter a valid email address." });
  try {
    const result = await loginOtp.resend(email);
    if (result.status === "no_pending") {
      return res.status(400).json({ error: "No sign-in code is waiting. Please sign in again." });
    }
    if (result.status === "cooldown") {
      return res.status(429).json({ error: "A code was just sent. Wait one minute before requesting another." });
    }
    return res.status(202).json({ message: "A new sign-in code is on its way. It expires in 5 minutes." });
  } catch (error) {
    console.error("[mail] Login code resend failed:", error.code || error.name);
    return res.status(503).json({ error: "We could not send the sign-in code. Please try again later or contact your health center." });
  }
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
