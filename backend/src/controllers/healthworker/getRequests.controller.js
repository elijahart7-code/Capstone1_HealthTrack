import { sql } from "../../config/db.js";

/** GET /api/health-worker/dashboard. */
export async function getDashboard(_req, res) {
  const [{ count: patientCount }] = await sql`SELECT COUNT(*)::int AS count FROM patients`;

  const [{ count: registeredThisMonth }] = await sql`
    SELECT COUNT(*)::int AS count FROM patients WHERE created_at >= date_trunc('month', NOW())
  `;

  const [{ count: withoutPortalLogin }] = await sql`
    SELECT COUNT(*)::int AS count FROM patients WHERE user_id IS NULL
  `;

  const recentPatients = await sql`SELECT * FROM patients ORDER BY created_at DESC`;

  return res.status(200).json({
    message: "Dashboard retrieved.",
    patientCount,
    registeredThisMonth,
    withoutPortalLogin,
    recentPatients,
  });
}
