import { sql } from "../../config/db.js";
import { calculateAge } from "../../utils/calculateAge.js";
import { isRecordType, RECORD_TYPES } from "../../config/recordTypes.js";
import { PatientPolicy } from "../../policies/policies.js";

function withComputed(patient) {
  return {
    ...patient,
    full_name: `${patient.last_name}, ${patient.first_name}${patient.middle_name ? " " + patient.middle_name : ""}`,
    age: calculateAge(patient.birthdate),
  };
}

export async function getAllPatients(req, res) {
  if (!PatientPolicy.viewAny(req.user)) {
    return res.status(403).json({ error: "You do not have access to the patient registry." });
  }

  const showArchived = req.user.role === "admin" && req.query.archived === "true";
  const patients = await sql.query(
    `SELECT p.*, COALESCE(u.is_verified, FALSE) AS is_verified
     FROM patients p LEFT JOIN users u ON u.user_id = p.user_id
     WHERE p.archived_at ${showArchived ? "IS NOT NULL" : "IS NULL"}
     ORDER BY p.last_name ASC, p.first_name ASC`
  );

  return res.status(200).json({ message: "Patients retrieved.", patients: patients.map(withComputed) });
}

export async function getPatient(req, res) {
  const rows = await sql`
    SELECT p.*, u.email, u.is_verified, u.created_at AS account_created_at
    FROM patients p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId}
      AND (p.archived_at IS NULL OR ${req.user.role === "admin"})
  `;
  const patient = rows[0];

  if (!patient) return res.status(404).json({ error: "Patient not found." });
  if (!PatientPolicy.view(req.user, patient)) {
    return res.status(403).json({ error: "You do not have access to this patient." });
  }

  return res.status(200).json({ message: "Patient retrieved.", patient: withComputed(patient) });
}

export async function getPatientAppointments(req, res) {
  const rows = await sql.query(
    `SELECT * FROM patients WHERE patient_id = $1 AND (archived_at IS NULL OR $2 = 'admin')`,
    [req.params.patientId, req.user.role]
  );
  const patient = rows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  if (!PatientPolicy.view(req.user, patient)) {
    return res.status(403).json({ error: "You do not have access to this patient." });
  }

  const appointments = await sql`
    SELECT * FROM appointments WHERE patient_id = ${req.params.patientId} ORDER BY scheduled_at DESC
  `;

  return res.status(200).json({ message: "Appointments retrieved.", appointments });
}

export async function getRecordTypes(_req, res) {
  return res.status(200).json({ message: "Record types retrieved.", recordTypes: RECORD_TYPES });
}

export async function getClinicalRecords(req, res) {
  const { patientId, type } = req.params;

  if (!isRecordType(type)) return res.status(404).json({ error: "Unknown record type." });

  const patientRows = await sql.query(
    `SELECT * FROM patients WHERE patient_id = $1 AND (archived_at IS NULL OR $2 = 'admin')`,
    [patientId, req.user.role]
  );
  const patient = patientRows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  if (!(req.user.role === "admin" || patient.user_id === req.user.user_id)) {
    return res.status(403).json({ error: "You do not have access to this patient's records." });
  }

  const definition = RECORD_TYPES[type];
  const perPage = Math.max(1, Math.min(10000, Number(req.query.perPage) || 10));
  const appointmentId = req.query.appointmentId || null;

  const records = await sql.query(
    `SELECT * FROM ${definition.table} WHERE patient_id = $1 AND ($3::text IS NULL OR appointment_id = $3) ORDER BY ${definition.dateField} DESC, id DESC LIMIT $2`,
    [patientId, perPage, appointmentId]
  );

  return res.status(200).json({ message: "Records retrieved.", type, definition, records });
}
