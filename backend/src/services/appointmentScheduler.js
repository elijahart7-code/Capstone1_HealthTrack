export async function cancelOverdueConfirmedAppointments(sql) {
  return sql`
    UPDATE appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE status = 'confirmed' AND scheduled_at <= (NOW() AT TIME ZONE 'Asia/Manila')
    RETURNING appointment_id
  `;
}
