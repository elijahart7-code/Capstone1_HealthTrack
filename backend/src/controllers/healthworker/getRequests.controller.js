import { sql } from "../../config/db.js";

export async function getDashboard(_req, res) {
  const [{ count: patientCount }] = await sql`SELECT COUNT(*)::int AS count FROM patients WHERE archived_at IS NULL`;

  const [{ count: registeredThisMonth }] = await sql`
    SELECT COUNT(*)::int AS count FROM patients WHERE archived_at IS NULL AND created_at >= date_trunc('month', NOW())
  `;

  const [{ count: withoutPortalLogin }] = await sql`
    SELECT COUNT(*)::int AS count FROM patients WHERE archived_at IS NULL AND user_id IS NULL
  `;

  const recentPatients = await sql`
    SELECT p.*, u.email, u.is_verified
    FROM patients p
    LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.archived_at IS NULL
    ORDER BY p.created_at DESC
  `;

  return res.status(200).json({
    message: "Dashboard retrieved.",
    patientCount,
    registeredThisMonth,
    withoutPortalLogin,
    recentPatients,
  });
}
