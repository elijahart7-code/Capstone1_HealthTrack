import { sql } from "../../config/db.js";

/** GET /api/admin/dashboard -- admin dashboard. */
export async function getDashboard(_req, res) {
  const [{ count: patientCount }] = await sql`SELECT COUNT(*)::int AS count FROM patients WHERE archived_at IS NULL`;

  const [{ count: appointmentsToday }] = await sql`
    SELECT COUNT(*)::int AS count FROM appointments
    WHERE scheduled_at >= date_trunc('day', NOW()) AND scheduled_at < date_trunc('day', NOW()) + INTERVAL '1 day'
  `;

  const [{ count: upcomingCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM appointments
    WHERE scheduled_at >= NOW() AND status NOT IN ('completed', 'cancelled')
  `;

  const todaysAppointments = await sql`
    SELECT a.*, p.first_name, p.last_name FROM appointments a
    JOIN patients p ON p.patient_id = a.patient_id
    WHERE a.scheduled_at >= date_trunc('day', NOW()) AND a.scheduled_at < date_trunc('day', NOW()) + INTERVAL '1 day'
    ORDER BY a.scheduled_at ASC
  `;

  const recentPatients = await sql`SELECT * FROM patients WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 5`;

  return res.status(200).json({
    message: "Dashboard retrieved.",
    patientCount,
    appointmentsToday,
    upcomingCount,
    todaysAppointments,
    recentPatients,
  });
}

/**
 * GET /api/admin/appointments
 * Admin appointment list.
 *
 * Returns the full appointment list in a single ordered payload so the
 * frontend can filter and group it client-side as needed.
 */
export async function getAppointments(_req, res) {
  const appointments = await sql`
    SELECT a.*, p.first_name, p.last_name FROM appointments a
    JOIN patients p ON p.patient_id = a.patient_id
    ORDER BY a.scheduled_at ASC
  `;

  return res.status(200).json({
    message: "Appointments retrieved.",
    appointments,
    statuses: ["pending", "confirmed", "completed", "cancelled"],
  });
}
