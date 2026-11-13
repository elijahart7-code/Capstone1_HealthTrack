import test from "node:test";
import assert from "node:assert/strict";
import { cancelOverdueConfirmedAppointments } from "../src/services/appointmentScheduler.js";

test("automatically cancels only confirmed appointments whose scheduled time has passed", async () => {
  let query = "";
  const sql = async (strings) => {
    query = strings.join("");
    return [{ appointment_id: "APT1" }];
  };

  const cancelled = await cancelOverdueConfirmedAppointments(sql);

  assert.match(query, /SET status = 'cancelled'/);
  assert.match(query, /WHERE status = 'confirmed' AND scheduled_at <= \(NOW\(\) AT TIME ZONE 'Asia\/Manila'\)/);
  assert.equal(cancelled[0].appointment_id, "APT1");
});
