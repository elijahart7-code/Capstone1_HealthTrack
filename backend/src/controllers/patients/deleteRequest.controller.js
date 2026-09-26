import { sql } from "../../config/db.js";
import { AppointmentPolicy, ClinicalRecordPolicy, PatientPolicy } from "../../policies/policies.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";

/** DELETE /api/appointments/:appointmentId -- Record::deleteAppointment(). */
export async function deleteAppointment(req, res) {
  if (!AppointmentPolicy.delete(req.user)) {
    return res.status(403).json({ error: "Only an admin may remove an appointment." });
  }

  const rows = await sql`DELETE FROM appointments WHERE appointment_id = ${req.params.appointmentId} RETURNING appointment_id`;
  if (rows.length === 0) return res.status(404).json({ error: "Appointment not found." });

  return res.status(200).json({ message: "Appointment removed." });
}

/** DELETE /api/patients/:patientId/records/:type/:recordId -- ClinicalRecords::delete(). */
export async function deleteClinicalRecord(req, res) {
  const { type, recordId, patientId } = req.params;
  if (!isRecordType(type)) return res.status(404).json({ error: "Unknown record type." });
  if (!ClinicalRecordPolicy.delete(req.user)) {
    return res.status(403).json({ error: "Only an admin may remove a clinical record." });
  }

  const definition = RECORD_TYPES[type];
  const rows = await sql.query(
    `DELETE FROM ${definition.table} WHERE record_id = $1 AND patient_id = $2 RETURNING record_id`,
    [recordId, patientId]
  );

  if (rows.length === 0) return res.status(404).json({ error: "Record not found." });

  return res.status(200).json({ message: `${definition.singular} removed.` });
}

/** POST /api/patients/:patientId/archive -- archives without deleting history. */
export async function archivePatient(req, res) {
  if (!PatientPolicy.delete(req.user)) {
    return res.status(403).json({ error: "Only an admin may remove a patient." });
  }

  const patientRows = await sql`
    SELECT patient_id
    FROM patients
    WHERE patient_id = ${req.params.patientId} AND archived_at IS NULL
  `;
  const patient = patientRows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });

  const rows = await sql.query(
    "UPDATE patients SET archived_at = NOW(), archived_by = $1, updated_at = NOW() WHERE patient_id = $2 AND archived_at IS NULL RETURNING patient_id, archived_at",
    [req.user.user_id, req.params.patientId]
  );

  if (rows.length === 0) return res.status(404).json({ error: "Patient not found." });

  return res.status(200).json({ message: "Patient archived.", patient: rows[0] });
}

/** POST /api/patients/:patientId/restore -- makes an archived patient active again. */
export async function restorePatient(req, res) {
  if (!PatientPolicy.delete(req.user)) {
    return res.status(403).json({ error: "Only an admin may restore a patient." });
  }

  const rows = await sql`
    UPDATE patients
    SET archived_at = NULL, archived_by = NULL, updated_at = NOW()
    WHERE patient_id = ${req.params.patientId} AND archived_at IS NOT NULL
    RETURNING *
  `;

  if (rows.length === 0) return res.status(404).json({ error: "Archived patient not found." });
  return res.status(200).json({ message: "Patient restored.", patient: rows[0] });
}
