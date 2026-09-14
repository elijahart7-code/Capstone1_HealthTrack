import bcrypt from "bcryptjs";
import { sql } from "../../config/db.js";
import { generateAppointmentId, generatePatientId, generateRecordId, generateUserId } from "../../utils/generateId.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";
import { AppointmentPolicy, ClinicalRecordPolicy, PatientPolicy } from "../../policies/policies.js";

/**
 * POST /api/patients
 *
 * Handles patient demographics and creates the patient portal login from the
 * supplied registration email.
 */
export async function registerPatient(req, res) {
  if (!PatientPolicy.register(req.user)) {
    return res.status(403).json({ error: "Only a health worker may register patients." });
  }

  const b = req.body;
  const required = [
    "full_name", "sex", "birthdate", "civil_status", "blood_type",
    "occupation", "barangay_id_number", "contact_number", "address",
    "emergency_contact_name", "emergency_contact_number", "portal_email",
  ];
  for (const field of required) {
    if (!b[field] || !String(b[field]).trim()) {
      return res.status(422).json({ error: `${field.replace(/_/g, " ")} is required.` });
    }
  }

  const nameParts = b.full_name.trim().split(/\s+/);
  const firstName = nameParts.shift() ?? "";
  const lastName = nameParts.length > 0 ? nameParts.pop() : firstName;
  const middleName = nameParts.length > 0 ? nameParts.join(" ") : null;

  const patientId = await generatePatientId();

  const existing = await sql`SELECT id FROM users WHERE email = ${b.portal_email}`;
  if (existing.length > 0) return res.status(422).json({ error: "That email address is already in use." });

  const userId = await generateUserId();
  const password = await bcrypt.hash("password", 10);
  await sql`
    INSERT INTO users (user_id, name, email, password, role)
    VALUES (${userId}, ${b.full_name.trim()}, ${b.portal_email}, ${password}, 'patient')
  `;

  const rows = await sql`
    INSERT INTO patients (
      patient_id, user_id, first_name, middle_name, last_name, sex, birthdate,
      civil_status, blood_type, occupation, barangay_id_number, contact_number,
      address, nationality, place_of_birth, emergency_contact_name,
      emergency_contact_number, emergency_contact_relationship
    ) VALUES (
      ${patientId}, ${userId}, ${firstName}, ${middleName}, ${lastName}, ${b.sex}, ${b.birthdate},
      ${b.civil_status}, ${b.blood_type}, ${b.occupation}, ${b.barangay_id_number}, ${b.contact_number || null},
      ${b.address}, ${b.nationality || null}, ${b.place_of_birth || null},
      ${b.emergency_contact_name || null}, ${b.emergency_contact_number || null},
      ${b.emergency_contact_relationship || null}
    ) RETURNING *
  `;

  return res.status(201).json({ message: `${lastName}, ${firstName} registered.`, patient: rows[0] });
}

/**
 * POST /api/patients/:patientId/appointments
 */
export async function createAppointment(req, res) {
  if (!AppointmentPolicy.create(req.user)) {
    return res.status(403).json({ error: "Only an admin may schedule appointments." });
  }

  const patientRows = await sql`SELECT patient_id FROM patients WHERE patient_id = ${req.params.patientId}`;
  if (patientRows.length === 0) return res.status(404).json({ error: "Patient not found." });

  const { scheduledAt, reason, notes, status } = req.body;
  if (!scheduledAt || !reason) {
    return res.status(422).json({ error: "Date/time and reason are required." });
  }

  const appointmentId = await generateAppointmentId();

  const rows = await sql`
    INSERT INTO appointments (appointment_id, patient_id, admin_id, scheduled_at, reason, notes, status)
    VALUES (${appointmentId}, ${req.params.patientId}, ${req.user.user_id}, ${scheduledAt}, ${reason}, ${notes || null}, ${status || "pending"})
    RETURNING *
  `;

  return res.status(201).json({ message: "Appointment scheduled.", appointment: rows[0] });
}

/**
 * POST /api/patients/:patientId/portal-account
 *
 * Patient portal accounts use the required default password "password".
 */
export async function createPortalAccount(req, res) {
  if (!PatientPolicy.createAccount(req.user)) {
    return res.status(403).json({ error: "Only an admin may create a portal account." });
  }

  const patientRows = await sql`SELECT * FROM patients WHERE patient_id = ${req.params.patientId}`;
  const patient = patientRows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });

  // Nothing to do if a login already exists.
  if (patient.user_id) {
    return res.status(200).json({ message: "This patient already has a portal account.", patient });
  }

  const { email } = req.body;
  if (!email) return res.status(422).json({ error: "Email address is required." });

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) return res.status(422).json({ error: "That email address is already in use." });

  const userId = await generateUserId();
  const defaultPassword = await bcrypt.hash("password", 10);
  const fullName = `${patient.last_name}, ${patient.first_name}${patient.middle_name ? " " + patient.middle_name : ""}`;

  await sql`
    INSERT INTO users (user_id, name, email, password, role)
    VALUES (${userId}, ${fullName}, ${email}, ${defaultPassword}, 'patient')
  `;

  const updated = await sql`
    UPDATE patients SET user_id = ${userId}, updated_at = NOW() WHERE patient_id = ${req.params.patientId} RETURNING *
  `;

  return res.status(201).json({
    message: 'Portal account created. The patient can sign in with this email and the default password "password".',
    patient: updated[0],
  });
}

/**
 * POST /api/patients/:patientId/records/:type
 * Generic handler for all five record tables, driven by RECORD_TYPES.
 */
export async function createClinicalRecord(req, res) {
  const { patientId, type } = req.params;
  if (!isRecordType(type)) return res.status(404).json({ error: "Unknown record type." });

  if (!ClinicalRecordPolicy.create(req.user)) {
    return res.status(403).json({ error: "Only an admin may add clinical records." });
  }

  const patientRows = await sql`SELECT patient_id FROM patients WHERE patient_id = ${patientId}`;
  if (patientRows.length === 0) return res.status(404).json({ error: "Patient not found." });

  const definition = RECORD_TYPES[type];
  const body = req.body;
  const recordDate = body.recordDate;

  if (!recordDate) return res.status(422).json({ error: `${definition.dateLabel} is required.` });

  for (const [column, field] of Object.entries(definition.fields)) {
    if (field.required && !String(body[column] ?? "").trim()) {
      return res.status(422).json({ error: `${field.label} is required.` });
    }
  }

  const recordId = await generateRecordId(definition.table);
  const columns = Object.keys(definition.fields);
  const values = columns.map((c) => body[c] ?? null);

  // Column list is dynamic (driven by RECORD_TYPES), so this uses
  // sql.query() with positional params rather than the tagged template --
  // every value is still bound as a parameter, never string-concatenated.
  const allColumns = ["record_id", "patient_id", "created_by", ...columns, definition.dateField];
  const placeholders = allColumns.map((_, i) => `$${i + 1}`).join(", ");
  const params = [recordId, patientId, req.user.user_id, ...values, recordDate];

  const rows = await sql.query(
    `INSERT INTO ${definition.table} (${allColumns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    params
  );

  return res.status(201).json({ message: `${definition.singular} added.`, record: rows[0] });
}
