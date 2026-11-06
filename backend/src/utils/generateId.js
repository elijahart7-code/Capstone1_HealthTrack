import crypto from "node:crypto";
import { sql } from "../config/db.js";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

function randomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

async function generateUniqueId(table, idColumn, prefix) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${randomCode()}`;

    const rows = await sql.query(`SELECT 1 FROM ${table} WHERE ${idColumn} = $1 LIMIT 1`, [candidate]);

    if (rows.length === 0) return candidate;
  }

  throw new Error(`Could not generate a unique ID for ${table} after 5 attempts.`);
}

export const generateUserId = () => generateUniqueId("users", "user_id", "USR");
export const generatePatientId = () => generateUniqueId("patients", "patient_id", "PAT");
export const generateAppointmentId = () => generateUniqueId("appointments", "appointment_id", "APT");

const RECORD_TABLE_PREFIX = {
  midwife_notes: "NOTE",
  health_background: "HIST",
  allergies: "ALG",
};

export function generateRecordId(table) {
  const prefix = RECORD_TABLE_PREFIX[table] ?? "REC";
  return generateUniqueId(table, "record_id", prefix);
}
