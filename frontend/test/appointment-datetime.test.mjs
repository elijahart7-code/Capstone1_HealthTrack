import test from "node:test";
import assert from "node:assert/strict";
import { formatAppointmentDateTime, sortAppointmentsChronologically } from "../src/shared/appointments/dateTime.js";

test("appointment timestamps display the selected Manila time from local and zoned values", () => {
  for (const value of [
    "2026-11-14T02:35:00",
    "2026-11-13T18:35:00.000Z",
    "2026-11-14T02:35:00+08:00",
  ]) {
    assert.equal(
      formatAppointmentDateTime(value, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      "2:35 AM",
    );
  }
});

test("appointments are ordered from the nearest date to the farthest date", () => {
  const sorted = sortAppointmentsChronologically([
    { appointment_id: "later", scheduled_at: "2026-11-27T08:00:00" },
    { appointment_id: "nearest", scheduled_at: "2026-11-14T02:45:00.000Z" },
    { appointment_id: "middle", scheduled_at: "2026-11-15T10:00:00" },
  ]);

  assert.deepEqual(sorted.map(({ appointment_id }) => appointment_id), ["nearest", "middle", "later"]);
});
