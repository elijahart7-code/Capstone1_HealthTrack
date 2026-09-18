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

/**
 * DELETE /api/patients/:patientId -- destroys the patient and dependent
 * records. Explicit child deletes support production schemas whose legacy
 * foreign keys do not have ON DELETE CASCADE.
 */
export async function deletePatient(req, res) {
  if (!PatientPolicy.delete(req.user)) {
    return res.status(403).json({ error: "Only an admin may remove a patient." });
  }

  const patientRows = await sql`
    SELECT patient_id, user_id
    FROM patients
    WHERE patient_id = ${req.params.patientId}
  `;
  const patient = patientRows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });

  for (const table of [
    "appointments",
    "health_assessments",
    "vital_signs",
    "midwife_notes",
    "medical_histories",
    "allergies",
  ]) {
    await sql.query(`DELETE FROM ${table} WHERE patient_id = $1`, [req.params.patientId]);
  }

  const rows = await sql.query(
    "DELETE FROM patients WHERE patient_id = $1 RETURNING patient_id",
    [req.params.patientId]
  );

  if (rows.length === 0) return res.status(404).json({ error: "Patient not found." });

  if (patient.user_id) {
    await sql`
      DELETE FROM users
      WHERE user_id = ${patient.user_id}
        AND role = 'patient'
    `;
  }

  return res.status(200).json({ message: "Patient removed." });
}
