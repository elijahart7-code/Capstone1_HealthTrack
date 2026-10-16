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

/** GET /api/admin/reports -- aggregate dashboard data for charts and exports. */
export async function getReports(req, res) {
  const period = ["day", "week", "month", "year"].includes(req.query.period) ? req.query.period : "month";
  const status = ["pending", "confirmed", "completed", "cancelled"].includes(req.query.status)
    ? req.query.status
    : null;
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "")
    ? req.query.from
    : new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().slice(0, 10);
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "")
    ? req.query.to
    : new Date().toISOString().slice(0, 10);
  const statusClause = status ? " AND a.status = $3" : "";
  const statusValues = status ? [dateFrom, dateTo, status] : [dateFrom, dateTo];

  const [
    trend,
    reasons,
    statuses,
    conditions,
    allergyReactions,
    immunizations,
    summary,
  ] = await Promise.all([
    sql.query(
      `SELECT date_trunc('${period}', scheduled_at)::date AS period,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM appointments a
       WHERE scheduled_at >= $1::date
         AND scheduled_at < ($2::date + INTERVAL '1 day')${statusClause}
       GROUP BY 1 ORDER BY 1`,
      statusValues
    ),
    sql.query(
      `SELECT COALESCE(NULLIF(TRIM(reason), ''), 'Not specified') AS label, COUNT(*)::int AS count
       FROM appointments a
       WHERE scheduled_at >= $1::date
         AND scheduled_at < ($2::date + INTERVAL '1 day')${statusClause}
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      statusValues
    ),
    sql.query(
      `SELECT status AS label, COUNT(*)::int AS count
       FROM appointments a
       WHERE scheduled_at >= $1::date
         AND scheduled_at < ($2::date + INTERVAL '1 day')${statusClause}
       GROUP BY status ORDER BY count DESC`,
      statusValues
    ),
    sql.query(
      `SELECT COALESCE(NULLIF(TRIM(condition), ''), 'Not specified') AS label, COUNT(*)::int AS count
       FROM health_assessments
       WHERE assessment_date >= $1::date AND assessment_date < ($2::date + INTERVAL '1 day')
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      [dateFrom, dateTo]
    ),
    sql.query(
      `SELECT COALESCE(NULLIF(TRIM(reaction), ''), 'Not specified') AS label, COUNT(*)::int AS count
       FROM allergies
       WHERE recorded_at >= $1::date AND recorded_at < ($2::date + INTERVAL '1 day')
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      [dateFrom, dateTo]
    ),
    sql.query(
      `SELECT COALESCE(NULLIF(TRIM(immunization_status), ''), 'Not specified') AS label, COUNT(*)::int AS count
       FROM medical_histories
       WHERE recorded_at >= $1::date AND recorded_at < ($2::date + INTERVAL '1 day')
       GROUP BY 1 ORDER BY count DESC`,
      [dateFrom, dateTo]
    ),
    sql.query(
      `SELECT
         COUNT(*)::int AS total_appointments,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_appointments,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_appointments,
         COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int AS open_appointments,
         (SELECT COUNT(*)::int FROM health_assessments
          WHERE status IN ('active', 'monitoring')
            AND assessment_date >= $1::date
            AND assessment_date < ($2::date + INTERVAL '1 day')) AS active_conditions,
         (SELECT COUNT(*)::int FROM medical_histories
          WHERE immunization_status IN ('Up to date', 'Partially immunized')
            AND recorded_at >= $1::date
            AND recorded_at < ($2::date + INTERVAL '1 day')) AS immunized_patients
       FROM appointments
       WHERE scheduled_at >= $1::date
         AND scheduled_at < ($2::date + INTERVAL '1 day')${statusClause}`,
      statusValues
    ),
  ]);

  return res.status(200).json({
    message: "Reports retrieved.",
    filters: { period, status, from: dateFrom, to: dateTo },
    trend, reasons, statuses, conditions, allergyReactions, immunizations,
    summary: summary[0] || {},
  });
}
