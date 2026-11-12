import "dotenv/config";
import { randomBytes } from "node:crypto";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}

const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  // Local sessions expire when the API restarts unless a persistent secret is configured.
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(32).toString("hex"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  MAIL_PROVIDER: process.env.MAIL_PROVIDER?.trim().toLowerCase() || "gmail",
  MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL?.trim() || process.env.GMAIL_USER || "",
  BREVO_API_KEY: process.env.BREVO_API_KEY?.trim() || "",
  GMAIL_USER: process.env.GMAIL_USER || "",
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "") || "",
  // Shared access key hiding the staff portals (admin/health_worker). Empty
  // disables the gate; production staff services fail closed without it.
  STAFF_SITE_KEY: process.env.STAFF_SITE_KEY?.trim() || "",
  // Patient email-OTP sign-in. Explicit "true"/"false" always wins.
  // Unset or blank defaults to enabled in production and disabled locally,
  // so a fresh `git pull` never breaks local patient login when inbox mail
  // is not configured, while production keeps 2FA unless switched off.
  LOGIN_OTP_ENABLED: (() => {
    const flag = process.env.LOGIN_OTP_ENABLED?.trim().toLowerCase();
    if (flag === "true") return true;
    if (flag === "false") return false;
    return (process.env.NODE_ENV || "development") === "production";
  })(),
  CENTRE_NAME: process.env.HEALTHTRACK_CENTRE_NAME || "Barangay Health Center of Mambog I",
  CENTRE_BARANGAY: process.env.HEALTHTRACK_BARANGAY || "Mambog I",
  CENTRE_MUNICIPALITY: process.env.HEALTHTRACK_MUNICIPALITY || "Bacoor",
  CENTRE_PROVINCE: process.env.HEALTHTRACK_PROVINCE || "Cavite",
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()) || defaultCorsOrigins,
};
