import { sql } from "../config/db.js";
import { createAccountSetupService } from "./accountSetup.service.js";
import { assertMailConfigured, sendVerificationEmail } from "./mail.service.js";

export const accountSetup = createAccountSetupService({ sql, assertMailConfigured, sendVerificationEmail });

// Registration remains saved if email is unavailable. Staff see the failure and
// can retry delivery from the patient record after correcting configuration.
export async function deliverAccountSetup(email, send = true) {
  if (!send) return { status: "deferred", message: "Account pending. The patient can request a setup link from the sign-in screen." };
  try {
    const sent = await accountSetup.initiate(email);
    return { status: sent ? "sent" : "pending", message: sent ? "Confirmation email sent. The patient must confirm their email and set a password." : "Account pending. If an email was recently sent, wait one minute before requesting another." };
  } catch (error) {
    console.error("[mail] Account setup delivery failed:", error.code || error.name);
    return { status: "failed", message: "Patient saved, but the confirmation email could not be sent. Check the email provider settings, then retry from this patient record." };
  }
}
