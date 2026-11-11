import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

let transporter;

export function assertMailConfigured() {
  const provider = ENV.MAIL_PROVIDER || "gmail";
  if (!["gmail", "brevo"].includes(provider)) {
    throw new Error("MAIL_PROVIDER must be gmail or brevo.");
  }
  if (provider === "brevo" && (!ENV.BREVO_API_KEY || !ENV.MAIL_FROM_EMAIL)) {
    throw new Error("Brevo requires BREVO_API_KEY and a verified MAIL_FROM_EMAIL.");
  }
  if (provider === "gmail" && (!ENV.GMAIL_USER || !ENV.GMAIL_APP_PASSWORD)) {
    throw new Error("Gmail SMTP credentials are not configured.");
  }
  const origin = new URL(ENV.FRONTEND_URL);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error("FRONTEND_URL must be an HTTP(S) URL without credentials.");
  }
  if (ENV.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export async function sendLoginCodeEmail(email, code) {
  assertMailConfigured();
  const message = {
    from: { name: "HealthTrack System", address: ENV.MAIL_PROVIDER === "brevo" ? ENV.MAIL_FROM_EMAIL : ENV.GMAIL_USER },
    to: email,
    subject: "Your HealthTrack sign-in code",
    text: `Your HealthTrack sign-in code is ${code}.\n\nIt expires in 5 minutes. Enter it on the sign-in screen to finish logging in.\n\nIf you did not try to sign in, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#073b2a">
      <h2>Your sign-in code</h2>
      <p>Enter this 6-digit code on the HealthTrack sign-in screen to finish logging in.</p>
      <p style="margin:28px 0;font-size:32px;letter-spacing:8px;font-weight:bold">${escapeHtml(code)}</p>
      <p>This code expires in 5 minutes. If you did not try to sign in, you can ignore this email.</p>
    </div>`,
  };
  if (ENV.MAIL_PROVIDER === "brevo") {
    let response;
    try {
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": ENV.BREVO_API_KEY },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          sender: { name: message.from.name, email: message.from.address },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
      });
      if (!response.ok) {
        const error = new Error("Brevo rejected the sign-in code email.");
        error.code = `BREVO_HTTP_${response.status}`;
        throw error;
      }
      const result = await response.json();
      if (typeof result.messageId !== "string" || !result.messageId) {
        const error = new Error("Brevo did not confirm email acceptance.");
        error.code = "BREVO_INVALID_RESPONSE";
        throw error;
      }
    } catch (error) {
      const failure = new Error("Brevo email delivery failed.");
      failure.code = typeof error.code === "string" && error.code.startsWith("BREVO_") ? error.code : "BREVO_REQUEST_FAILED";
      throw failure;
    }
    return;
  }

  transporter ||= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: ENV.GMAIL_USER, pass: ENV.GMAIL_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const result = await transporter.sendMail(message);
  if (!result.accepted?.length) throw new Error("SMTP did not accept the sign-in code email.");
}

export async function sendVerificationEmail(email, token) {
  assertMailConfigured();
  const url = new URL("/confirm-account", ENV.FRONTEND_URL);
  url.searchParams.set("token", token);
  const confirmUrl = url.toString();
  const message = {
    from: { name: "HealthTrack System", address: ENV.MAIL_PROVIDER === "brevo" ? ENV.MAIL_FROM_EMAIL : ENV.GMAIL_USER },
    to: email,
    subject: "Confirm your HealthTrack Account",
    text: `Welcome to HealthTrack!\n\nConfirm this is your email and set your password:\n${confirmUrl}\n\nThis link expires in 15 minutes. Opening it will not activate your account until you submit your password. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#073b2a">
      <h2>Welcome to HealthTrack</h2>
      <p>Your health center has created your patient portal account. Confirm this is your email and choose your password to get started.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:14px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Yes, this is me</a></p>
      <p>This link expires in 15 minutes. Your account is activated only after you submit your new password.</p>
      <p>If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
      <p style="color:#64748b;font-size:13px">If you did not expect this email, you can ignore it.</p>
    </div>`,
  };
  if (ENV.MAIL_PROVIDER === "brevo") {
    // HTTPS on port 443 works on Render Free, whose SMTP ports are blocked.
    // Never retry automatically: a timed-out request might already be queued.
    let response;
    try {
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": ENV.BREVO_API_KEY },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          sender: { name: message.from.name, email: message.from.address },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
      });
      if (!response.ok) {
        // Provider responses may contain addresses or other sensitive details.
        // Surface only the status, never the response body or API key.
        const error = new Error("Brevo rejected the verification email.");
        error.code = `BREVO_HTTP_${response.status}`;
        throw error;
      }
      const result = await response.json();
      if (typeof result.messageId !== "string" || !result.messageId) {
        const error = new Error("Brevo did not confirm email acceptance.");
        error.code = "BREVO_INVALID_RESPONSE";
        throw error;
      }
    } catch (error) {
      const failure = new Error("Brevo email delivery failed.");
      failure.code = typeof error.code === "string" && error.code.startsWith("BREVO_") ? error.code : "BREVO_REQUEST_FAILED";
      throw failure;
    }
    return;
  }

  transporter ||= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: ENV.GMAIL_USER, pass: ENV.GMAIL_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const result = await transporter.sendMail(message);
  if (!result.accepted?.length) throw new Error("SMTP did not accept the verification email.");
}
