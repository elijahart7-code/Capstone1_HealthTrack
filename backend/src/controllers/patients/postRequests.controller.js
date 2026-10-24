import bcrypt from "bcryptjs";
import { sql } from "../../config/db.js";
import { generateAppointmentId, generatePatientId, generateRecordId, generateUserId } from "../../utils/generateId.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";
import { AppointmentPolicy, ClinicalRecordPolicy, PatientPolicy } from "../../policies/policies.js";
import { validatePlaceOfBirth } from "../../utils/placeOfBirth.js";

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
    "first_name", "last_name", "sex", "birthdate", "civil_status", "blood_type",
    "occupation", "barangay_id_number", "contact_number", "address",
    "emergency_contact_name", "emergency_contact_number",
  ];
  for (const field of required) {
    if (!b[field] || !String(b[field]).trim()) {
      return res.status(422).json({ error: `${field.replace(/_/g, " ")} is required.` });
    }
  }

  const birthplace = await validatePlaceOfBirth(b.place_of_birth_data);
  if (birthplace.error) return res.status(422).json({ error: birthplace.error });

  const firstName = b.first_name.trim();
  const middleName = b.middle_name?.trim() || null;
  const lastName = b.last_name.trim();
  const fullName = `${firstName}${middleName ? ` ${middleName}` : ""} ${lastName}`;

  const patientId = await generatePatientId();

  let userId = null;
  if (b.portal_email && String(b.portal_email).trim()) {
    const existing = await sql`SELECT id FROM users WHERE email = ${b.portal_email}`;
    if (existing.length > 0) return res.status(422).json({ error: "That email address is already in use." });

    userId = await generateUserId();
    const password = await bcrypt.hash("password", 10);
    await sql`
      INSERT INTO users (user_id, name, email, password, role)
      VALUES (${userId}, ${fullName}, ${b.portal_email}, ${password}, 'patient')
    `;
  }

  const rows = await sql`
    INSERT INTO patients (
      patient_id, user_id, first_name, middle_name, last_name, sex, birthdate,
      civil_status, blood_type, occupation, barangay_id_number, contact_number,
      address, nationality, place_of_birth, emergency_contact_name,
      emergency_contact_number, emergency_contact_relationship, place_of_birth_data
    ) VALUES (
      ${patientId}, ${userId}, ${firstName}, ${middleName}, ${lastName}, ${b.sex}, ${b.birthdate},
      ${b.civil_status}, ${b.blood_type}, ${b.occupation}, ${b.barangay_id_number}, ${b.contact_number || null},
      ${b.address}, ${b.nationality || null}, ${birthplace.display},
      ${b.emergency_contact_name || null}, ${b.emergency_contact_number || null},
      ${b.emergency_contact_relationship || null}, ${JSON.stringify({ ...birthplace.value, verified: birthplace.verified })}::jsonb
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

  const patientRows = await sql`SELECT patient_id FROM patients WHERE patient_id = ${req.params.patientId} AND archived_at IS NULL`;
  if (patientRows.length === 0) return res.status(404).json({ error: "Patient not found." });

  const { scheduledAt, reason, notes, status } = req.body;
  if (!scheduledAt || !reason) {
    return res.status(422).json({ error: "Date/time and reason are required." });
  }

  if (status && !["confirmed", "cancelled"].includes(status)) {
    return res.status(422).json({ error: "Unknown appointment status." });
  }
  const appointmentId = await generateAppointmentId();

  const rows = await sql`
    INSERT INTO appointments (appointment_id, patient_id, admin_id, scheduled_at, reason, notes, status)
    VALUES (${appointmentId}, ${req.params.patientId}, ${req.user.user_id}, ${scheduledAt}, ${reason}, ${notes || null}, ${status || "confirmed"})
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

  const patientRows = await sql`
    SELECT p.*, u.email, u.created_at AS account_created_at
    FROM patients p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId} AND p.archived_at IS NULL
  `;
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

  await sql`
    UPDATE patients
    SET user_id = ${userId}, updated_at = NOW()
    WHERE patient_id = ${req.params.patientId}
  `;

  const updated = await sql`
    SELECT p.*, u.email, u.created_at AS account_created_at
    FROM patients p
    JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId}
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

  const patientRows = await sql`SELECT patient_id FROM patients WHERE patient_id = ${patientId} AND archived_at IS NULL`;
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

  const appointmentId = body.appointmentId || null;
  if (appointmentId) {
    const matches = await sql`SELECT appointment_id FROM appointments WHERE appointment_id = ${appointmentId} AND patient_id = ${patientId}`;
    if (!matches.length) return res.status(422).json({ error: "Appointment does not belong to this patient." });
  }
  const recordId = await generateRecordId(definition.table);
  const columns = Object.keys(definition.fields);
  const values = columns.map((c) => body[c] ?? null);

  // Column list is dynamic (driven by RECORD_TYPES), so this uses
  // sql.query() with positional params rather than the tagged template --
  // every value is still bound as a parameter, never string-concatenated.
  const allColumns = ["record_id", "patient_id", "appointment_id", "created_by", ...columns, definition.dateField];
  const placeholders = allColumns.map((_, i) => `$${i + 1}`).join(", ");
  const params = [recordId, patientId, appointmentId, req.user.user_id, ...values, recordDate];

  const rows = await sql.query(
    `INSERT INTO ${definition.table} (${allColumns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    params
  );

  return res.status(201).json({ message: `${definition.singular} added.`, record: rows[0] });
}

/** Save all required sections and complete the appointment in one transaction. */
export async function createAppointmentRecords(req, res) {
  if (!ClinicalRecordPolicy.create(req.user)) {
    return res.status(403).json({ error: "Only an admin may add clinical records." });
  }
  const { patientId, appointmentId } = req.params;
  const records = req.body.records;
  if (!records || typeof records !== "object" || Array.isArray(records) || !Object.keys(records).length) {
    return res.status(422).json({ error: "Choose at least one clinical section to save." });
  }
  const entries = Object.entries(records);
  if (Object.keys(RECORD_TYPES).some(type => !Object.hasOwn(records, type))) {
    return res.status(422).json({ error: "Complete all required clinical sections before finishing recording." });
  }
  // Validate every section before generating IDs or inserting any rows.
  for (const [type, body] of entries) {
    if (!isRecordType(type) || !body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(422).json({ error: "Unknown clinical section." });
    }
    const def = RECORD_TYPES[type];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.recordDate || "") || !Number.isFinite(Date.parse(body.recordDate))) {
      return res.status(422).json({ error: `${def.label}: a valid ${def.dateLabel.toLowerCase()} is required.` });
    }
    for (const [key, field] of Object.entries(def.fields)) {
      const value = body[key];
      if (field.required && !String(value ?? "").trim()) {
        return res.status(422).json({ error: `${def.label}: ${field.label} is required.` });
      }
      if (value !== undefined && value !== null && value !== "") {
        if (field.type === "number" && !Number.isFinite(Number(value))) {
          return res.status(422).json({ error: `${def.label}: ${field.label} must be a number.` });
        }
        if (field.type === "select" && !Object.hasOwn(field.options, value)) {
          return res.status(422).json({ error: `${def.label}: invalid ${field.label.toLowerCase()}.` });
        }
      }
    }
  }
  const params = [patientId, appointmentId, req.user.user_id];
  const ctes = [
    `eligible AS (SELECT a.appointment_id FROM appointments a JOIN patients p ON p.patient_id = a.patient_id
      WHERE a.patient_id = $1 AND a.appointment_id = $2 AND a.status = 'confirmed'
      AND p.archived_at IS NULL FOR UPDATE OF a, p)`,
  ];
  for (const [index, [type, body]] of entries.entries()) {
    const def = RECORD_TYPES[type];
    const columns = Object.keys(def.fields);
    const recordId = await generateRecordId(def.table);
    const values = [recordId, ...columns.map(key => body[key] === "" ? null : body[key] ?? null), body.recordDate];
    const slots = values.map(value => { params.push(value); return `$${params.length}`; });
    ctes.push(`saved_${index} AS (INSERT INTO ${def.table}
      (record_id, patient_id, appointment_id, created_by, ${columns.join(", ")}, ${def.dateField})
      SELECT ${slots[0]}, $1, $2, $3, ${slots.slice(1).join(", ")} FROM eligible RETURNING record_id)`);
  }
  ctes.push(`finished AS (UPDATE appointments SET status = 'completed', updated_at = NOW()
    WHERE appointment_id IN (SELECT appointment_id FROM eligible)
    AND ${entries.map((_, i) => `(SELECT COUNT(*) FROM saved_${i}) = 1`).join(" AND ")}
    RETURNING appointment_id)`);
  // A single data-modifying CTE is a single PostgreSQL transaction on both
  // local pg and Neon. Any insertion failure rolls back the whole session.
  const result = await sql.query(`WITH ${ctes.join(",\n")}
    SELECT (SELECT COUNT(*) FROM eligible)::int AS eligible, (SELECT COUNT(*) FROM finished)::int AS finished,
      ${entries.map((_, i) => `(SELECT COUNT(*) FROM saved_${i})::int AS saved_${i}`).join(", ")}`, params);
  if (!result[0]?.eligible || !result[0]?.finished) {
    return res.status(409).json({ error: "This appointment is no longer available for recording. Your draft has not been saved." });
  }
  return res.status(201).json({ message: "Appointment recording completed.", appointmentStatus: "completed", sectionsSaved: entries.length });
}
