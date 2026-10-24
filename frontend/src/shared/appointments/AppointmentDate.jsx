import { useEffect, useState } from "react";

export function isLateAppointment(appointment, now = Date.now()) {
  return !["completed", "cancelled"].includes(appointment.status) && new Date(appointment.scheduled_at).getTime() < now;
}

export function AppointmentDate({ appointment, timeOnly = false }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const date = new Date(appointment.scheduled_at);
  const late = isLateAppointment(appointment, now);
  return <span className={late ? "ht-appointment-date-late" : undefined}>{timeOnly ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : date.toLocaleString()}{late && " - Late"}</span>;
}
