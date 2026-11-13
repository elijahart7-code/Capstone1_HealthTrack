import { useEffect, useState } from "react";
import { formatAppointmentDateTime, parseAppointmentDateTime } from "./dateTime";

export function isLateAppointment(appointment, now = Date.now()) {
  return !["completed", "cancelled"].includes(appointment.status) && parseAppointmentDateTime(appointment.scheduled_at).getTime() < now;
}

export function AppointmentDate({ appointment, timeOnly = false }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const date = parseAppointmentDateTime(appointment.scheduled_at);
  const late = isLateAppointment(appointment, now);
  return <span className={late ? "ht-appointment-date-late" : undefined}>{timeOnly ? formatAppointmentDateTime(appointment.scheduled_at, { hour: "2-digit", minute: "2-digit" }) : formatAppointmentDateTime(appointment.scheduled_at)}{late && " - Late"}</span>;
}
