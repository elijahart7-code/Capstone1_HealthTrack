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

/**
 * GET /api/patients
 * Shared by admin and health worker, both authorized via PatientPolicy.viewAny.
 *
 * Returns the full patient roster in one payload so the frontend can search,
 * sort, and paginate client-side rather than exposing a growing set of query
 * parameters for a small local registry.
 */
export async function getAllPatients(req, res) {
  if (!PatientPolicy.viewAny(req.user)) {
    return res.status(403).json({ error: "You do not have access to the patient registry." });
  }

  const patients = await sql`SELECT * FROM patients ORDER BY last_name ASC, first_name ASC`;

  return res.status(200).json({ message: "Patients retrieved.", patients: patients.map(withComputed) });
}

/** GET /api/patients/:patientId -- one patient's demographic record. */
export async function getPatient(req, res) {
  const rows = await sql`
    SELECT p.*, u.email, u.created_at AS account_created_at
    FROM patients p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.patient_id = ${req.params.patientId}
  `;
  const patient = rows[0];

  if (!patient) return res.status(404).json({ error: "Patient not found." });
  if (!PatientPolicy.view(req.user, patient)) {
    return res.status(403).json({ error: "You do not have access to this patient." });
  }

  return res.status(200).json({ message: "Patient retrieved.", patient: withComputed(patient) });
}

/** GET /api/patients/:patientId/appointments -- newest first, like Record::render(). */
export async function getPatientAppointments(req, res) {
  const rows = await sql`SELECT * FROM patients WHERE patient_id = ${req.params.patientId}`;
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

/** GET /api/patients/record-types -- config exposed for the frontend's tabs/forms. */
export async function getRecordTypes(_req, res) {
  return res.status(200).json({ message: "Record types retrieved.", recordTypes: RECORD_TYPES });
}

/**
 * GET /api/patients/:patientId/records/:type?perPage=10
 * Generic handler for all five clinical record tables, driven by RECORD_TYPES.
 */
export async function getClinicalRecords(req, res) {
  const { patientId, type } = req.params;

  if (!isRecordType(type)) return res.status(404).json({ error: "Unknown record type." });

  const patientRows = await sql`SELECT * FROM patients WHERE patient_id = ${patientId}`;
  const patient = patientRows[0];
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  if (!(req.user.role === "admin" || req.user.role === "health_worker" || patient.user_id === req.user.user_id)) {
    return res.status(403).json({ error: "You do not have access to this patient's records." });
  }

  const definition = RECORD_TYPES[type];
  const perPage = Math.min(200, Number(req.query.perPage) || 10);

  // definition.table / definition.dateField come from our own fixed
  // RECORD_TYPES map, never from user input, so interpolating them into the
  // query text is safe; patientId and perPage are still bound params.
  const records = await sql.query(
    `SELECT * FROM ${definition.table} WHERE patient_id = $1 ORDER BY ${definition.dateField} DESC, id DESC LIMIT $2`,
    [patientId, perPage]
  );

  return res.status(200).json({ message: "Records retrieved.", type, definition, records });
}
