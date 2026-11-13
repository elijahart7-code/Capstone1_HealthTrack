import { sql } from "../../config/db.js";
import { calculateAge } from "../../utils/calculateAge.js";
import { RECORD_TYPES } from "../../config/recordTypes.js";

async function findMyPatient(userId) {
  const rows = await sql`
    SELECT p.*, u.email, u.created_at AS account_created_at, u.verified_at AS account_activated_at, p.created_at AS patient_created_at
    FROM patients p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.user_id = ${userId} AND p.archived_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function getDashboard(req, res) {
  const patient = await findMyPatient(req.user.user_id);

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
