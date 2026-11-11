import { sql } from "../config/db.js";
import { assertMailConfigured, sendLoginCodeEmail } from "./mail.service.js";
import { createLoginOtpService } from "./loginOtp.service.js";

export const loginOtp = createLoginOtpService({ sql, assertMailConfigured, sendLoginCodeEmail });
