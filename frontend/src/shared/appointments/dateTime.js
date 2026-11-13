const APPOINTMENT_TIME_ZONE = "Asia/Manila";
const APPOINTMENT_UTC_OFFSET_HOURS = 8;
const DEFAULT_FORMAT_OPTIONS = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function parseAppointmentDateTime(value) {
  if (typeof value === "string") {
    const hasTimeZone = /[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value);
    if (hasTimeZone) return new Date(value);

    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/.exec(value);
    if (match) {
      const [, year, month, day, hour, minute, second = "0", fraction = ""] = match;
      const millisecond = Number(`0.${fraction}`) * 1000;
      return new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour) - APPOINTMENT_UTC_OFFSET_HOURS,
        Number(minute),
        Number(second),
        millisecond,
      ));
    }
  }

  return new Date(value);
}

export function formatAppointmentDateTime(value, options) {
  return new Intl.DateTimeFormat(undefined, {
    ...(options || DEFAULT_FORMAT_OPTIONS),
    timeZone: APPOINTMENT_TIME_ZONE,
  }).format(parseAppointmentDateTime(value));
}

export function sortAppointmentsChronologically(appointments) {
  return [...appointments].sort((a, b) => parseAppointmentDateTime(a.scheduled_at) - parseAppointmentDateTime(b.scheduled_at));
}
