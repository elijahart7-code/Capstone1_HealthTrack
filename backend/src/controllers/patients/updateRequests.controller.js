import { sql } from "../../config/db.js";
import { AppointmentPolicy, ClinicalRecordPolicy, PatientPolicy } from "../../policies/policies.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";
import { validatePlaceOfBirth } from "../../utils/placeOfBirth.js";
import { deliverAccountSetup } from "../../services/accountSetup.js";
import { isValidEmail, normalizeEmail } from "../../services/accountSetup.service.js";

const VALID_STATUSES = ["confirmed", "cancelled"];

export async function updatePendingPortalEmail(req, res) {
  if (!PatientPolicy.createAccount(req.user)) {
    return res.status(403).json({ error: "Only staff may correct a pending portal email." });
  }
  const email = normalizeEmail(req.body?.email);
  const currentEmail = normalizeEmail(req.body?.current_email);
  if (!isValidEmail(email) || !isValidEmail(currentEmail)) {
    return res.status(422).json({ error: "Enter a valid new email address and the current account email." });
  }
  if (email === currentEmail) {
    return res.status(422).json({ error: "Enter a different email address, or use Resend setup email." });
  }
  const accounts = await sql`
    SELECT u.user_id, u.is_verified, u.email FROM patients p
    JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId} AND p.archived_at IS NULL AND u.role = 'patient'
  `;
  const account = accounts[0];
  if (!account) return res.status(404).json({ error: "Active patient portal account not found." });
  if (account.is_verified || normalizeEmail(account.email) !== currentEmail) {
    return res.status(409).json({ error: "This account is already verified or its email has changed. Refresh the record before continuing." });
  }
  const duplicate = await sql`SELECT user_id FROM users WHERE LOWER(email) = ${email} AND user_id <> ${account.user_id}`;
  if (duplicate.length) return res.status(422).json({ error: "That email address is already in use." });

  // Updating the email and clearing its old token are one write. A concurrent
  // confirmation or another staff correction must win or lose as a whole.
  let updated;
  try {
    updated = await sql`
      UPDATE users u SET email = ${email}, verification_token = NULL,
        token_expires_at = NULL, verification_sent_at = NULL, updated_at = NOW()
      WHERE user_id = ${account.user_id} AND LOWER(email) = ${currentEmail}
        AND is_verified = FALSE AND role = 'patient'
        AND EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = ${req.params.patientId}
          AND p.user_id = u.user_id AND p.archived_at IS NULL)
      RETURNING user_id
    `;
  } catch (error) {
    if (error.code === "23505") return res.status(422).json({ error: "That email address is already in use." });
    throw error;
  }
  if (!updated.length) {
    return res.status(409).json({ error: "This account changed while saving. Refresh the record before continuing." });
  }

  const verification = await deliverAccountSetup(email);
  if (verification.status === "failed") {
    verification.message = "Email updated, but the confirmation email could not be sent. Check the email provider settings, then use Resend setup email.";
  }
  const patients = await sql`
    SELECT p.*, u.email, u.is_verified, u.created_at AS account_created_at
    FROM patients p JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId}
  `;
  return res.json({ message: "Portal email updated. The patient must confirm the new email and set a password.", patient: patients[0], verification });
}

export async function updateAppointmentStatus(req, res) {
  if (!AppointmentPolicy.update(req.user)) {
    return res.status(403).json({ error: "Only an admin may update an appointment." });
  }

  const { status } = req.body;
  if (status === "completed") return res.status(422).json({ error: "Use Finish recording to complete an appointment." });
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(422).json({ error: "Unknown appointment status." });
  }

  const rows = await sql`
    UPDATE appointments SET status = ${status}, updated_at = NOW()
    WHERE appointment_id = ${req.params.appointmentId}
    RETURNING *
  `;

  if (rows.length === 0) return res.status(404).json({ error: "Appointment not found." });

  return res.status(200).json({ message: "Appointment updated.", appointment: rows[0] });
}

export async function updatePatient(req, res) {
  if (!PatientPolicy.update(req.user)) {
    return res.status(403).json({ error: "You do not have access to edit patients." });
  }

  const editable = [
    "first_name", "middle_name", "last_name", "sex", "birthdate", "civil_status",
    "blood_type", "occupation", "barangay_id_number", "contact_number", "address",
    "nationality", "place_of_birth", "emergency_contact_name",
    "emergency_contact_number", "emergency_contact_relationship", "place_of_birth_data",
  ];

  const b = req.body;
  if ("place_of_birth_data" in b) {
    const birthplace = await validatePlaceOfBirth(b.place_of_birth_data);
    if (birthplace.error) return res.status(422).json({ error: birthplace.error });
    b.place_of_birth_data = JSON.stringify({ ...birthplace.value, verified: birthplace.verified });
    b.place_of_birth = birthplace.display;
  }
  const setClauses = editable.filter((c) => c in b);

  if (setClauses.length === 0) return res.status(422).json({ error: "No fields to update." });

  const assignments = setClauses.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const params = setClauses.map((c) => b[c] ?? null);
  params.push(req.params.patientId);

  const rows = await sql.query(
    `UPDATE patients SET ${assignments}, updated_at = NOW() WHERE patient_id = $${params.length} AND archived_at IS NULL RETURNING *`,
    params
  );

  if (rows.length === 0) return res.status(404).json({ error: "Patient not found." });

  return res.status(200).json({ message: "Patient updated.", patient: rows[0] });
}

export async function updateClinicalRecord(req, res) {
  const { patientId, type, recordId } = req.params;
  if (!isRecordType(type)) return res.status(404).json({ error: "Unknown record type." });
  if (!ClinicalRecordPolicy.update(req.user)) {
    return res.status(403).json({ error: "Only an admin may update a clinical record." });
  }

  const definition = RECORD_TYPES[type];
  const body = req.body;
  const recordDate = body.recordDate;

  if (!recordDate) return res.status(422).json({ error: `${definition.dateLabel} is required.` });

  for (const [column, field] of Object.entries(definition.fields)) {
    if (field.required && !String(body[column] ?? "").trim()) {
      return res.status(422).json({ error: `${field.label} is required.` });
    }
  }

  const columns = Object.keys(definition.fields);
  const assignments = [...columns, definition.dateField]
    .map((column, index) => `${column} = $${index + 1}`)
    .join(", ");
  const params = [...columns.map((column) => body[column] ?? null), recordDate, recordId, patientId];

  const rows = await sql.query(
    `UPDATE ${definition.table} SET ${assignments}, updated_at = NOW()
     WHERE record_id = $${params.length - 1} AND patient_id = $${params.length}
     RETURNING *`,
    params
  );

  if (rows.length === 0) return res.status(404).json({ error: "Record not found." });

  return res.status(200).json({
    message: `${definition.singular} updated.`,
    record: rows[0],
  });
}
