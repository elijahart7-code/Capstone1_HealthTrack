import { sql } from "../../config/db.js";
import { calculateAge } from "../../utils/calculateAge.js";
import { RECORD_TYPES } from "../../config/recordTypes.js";

async function findMyPatient(userId) {
  const rows = await sql`SELECT * FROM patients WHERE user_id = ${userId} AND archived_at IS NULL`;
  return rows[0] ?? null;
}

/** GET /api/patient/dashboard. */
export async function getDashboard(req, res) {
  const patient = await findMyPatient(req.user.user_id);

  // A patient account should always have a matching patient record; if the
  // link is missing, return an empty-state payload rather than a 500.
  if (!patient) return res.status(200).json({ message: "No linked patient record.", patient: null });

  const upcomingAppointments = await sql`
    SELECT * FROM appointments
    WHERE patient_id = ${patient.patient_id} AND scheduled_at >= NOW() AND status NOT IN ('completed', 'cancelled')
    ORDER BY scheduled_at ASC LIMIT 5
  `;

  const [{ count: upcomingCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM appointments
    WHERE patient_id = ${patient.patient_id} AND scheduled_at >= NOW() AND status NOT IN ('completed', 'cancelled')
  `;

  const [{ count: allergyCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM allergies WHERE patient_id = ${patient.patient_id}
  `;

  return res.status(200).json({
    message: "Dashboard retrieved.",
    patient: { ...patient, age: calculateAge(patient.birthdate) },
    upcomingAppointments,
    upcomingCount,
    allergyCount,
  });
}

/**
 * GET /api/patient/health-information
 * Read-only view of every clinical record type plus the full appointment
 * history for the linked patient.
 */
export async function getHealthInformation(req, res) {
  const patient = await findMyPatient(req.user.user_id);
  if (!patient) return res.status(200).json({ message: "No linked patient record.", patient: null });

  const appointments = await sql`
    SELECT * FROM appointments WHERE patient_id = ${patient.patient_id} ORDER BY scheduled_at DESC
  `;

  const records = {};
  for (const [key, definition] of Object.entries(RECORD_TYPES)) {
    records[key] = await sql.query(
      `SELECT * FROM ${definition.table} WHERE patient_id = $1 ORDER BY ${definition.dateField} DESC, id DESC`,
      [patient.patient_id]
    );
  }

  return res.status(200).json({
    message: "Health information retrieved.",
    patient: { ...patient, age: calculateAge(patient.birthdate) },
    recordTypes: RECORD_TYPES,
    records,
    appointments,
  });
}
