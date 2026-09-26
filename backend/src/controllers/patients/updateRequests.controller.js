import { sql } from "../../config/db.js";
import { AppointmentPolicy, ClinicalRecordPolicy, PatientPolicy } from "../../policies/policies.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

/**
 * PATCH /api/appointments/:appointmentId/status
 * Updates an appointment status from the admin appointment screen.
 */
export async function updateAppointmentStatus(req, res) {
  if (!AppointmentPolicy.update(req.user)) {
    return res.status(403).json({ error: "Only an admin may update an appointment." });
  }

  const { status } = req.body;
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

/** PATCH /api/patients/:patientId -- update a patient's demographic record. */
export async function updatePatient(req, res) {
  if (!PatientPolicy.update(req.user)) {
    return res.status(403).json({ error: "You do not have access to edit patients." });
  }

  const editable = [
    "first_name", "middle_name", "last_name", "sex", "birthdate", "civil_status",
    "blood_type", "occupation", "barangay_id_number", "contact_number", "address",
    "nationality", "place_of_birth", "emergency_contact_name",
    "emergency_contact_number", "emergency_contact_relationship",
  ];

  const b = req.body;
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

/** PATCH /api/patients/:patientId/records/:type/:recordId -- update a clinical record. */
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
