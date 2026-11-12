import test, { before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Aggregate statistical report over real PostgreSQL statements in an isolated
// WASM database. Scope A: counts only — the payload must carry no names.
const db = new PGlite();
const sql = (strings, ...params) => sql.query(strings.reduce((query, part, index) => query + part + (index < params.length ? `$${index + 1}` : ""), ""), params);
sql.query = async (query, params = []) => (await db.query(query, params)).rows;

const source = await readFile(new URL("../src/controllers/admin/getRequests.controller.js", import.meta.url), "utf8");
const { getAggregateReport } = vm.runInNewContext(
  `${source.replace(/^import .*;\r?\n/gm, "").replace(/export /g, "")}\n;({ getAggregateReport });`,
  { sql, console }
);

function response() { return { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; }

before(async () => {
  const dbSource = await readFile(new URL("../src/config/db.js", import.meta.url), "utf8");
  for (const [, createSQL] of dbSource.matchAll(/^    createSQL: `([\s\S]*?)`/gm)) await db.exec(createSQL);
});

beforeEach(async () => {
  await db.exec("TRUNCATE patients, appointments, health_assessments, health_background, allergies, vital_signs, midwife_notes CASCADE");
  await db.query(`INSERT INTO patients (patient_id, first_name, last_name, sex, birthdate, address, created_at) VALUES
    ('P1', 'Zedrick', 'Uno', 'male', '1990-05-01', 'Addr 1', '2026-10-05'),
    ('P2', 'Xenia', 'Dos', 'female', '2020-03-01', 'Addr 2', '2026-10-10'),
    ('P3', 'Yolanda', 'Tres', 'female', '1950-01-01', 'Addr 3', '2026-10-10')`);
  await db.query(`UPDATE patients SET archived_at = NOW() WHERE patient_id = 'P3'`);
  await db.query(`INSERT INTO appointments (appointment_id, patient_id, scheduled_at, status, reason) VALUES
    ('A1', 'P1', '2026-10-10', 'completed', 'General Checkup'),
    ('A2', 'P2', '2026-10-12', 'completed', 'General Checkup'),
    ('A3', 'P1', '2026-10-11', 'cancelled', 'Vaccination')`);
  await db.query(`INSERT INTO health_assessments (record_id, patient_id, condition, assessment_date, status) VALUES
    ('H1', 'P1', 'Leptospirosis', '2026-10-10', 'active'),
    ('H2', 'P2', 'Leptospirosis', '2026-10-12', 'active'),
    ('H3', 'P1', 'Hypertension', '2026-10-11', 'monitoring'),
    ('H4', 'P3', 'Dengue', '2026-10-12', 'active')`);
  await db.query(`INSERT INTO health_background (record_id, patient_id, past_illnesses, chronic_conditions, past_surgeries, previous_hospitalizations, family_medical_history, immunization_status, recorded_at) VALUES
    ('B1', 'P1', 'none', 'none', 'none', 'none', 'none', 'Up to Date', '2026-10-10'),
    ('B2', 'P2', 'none', 'none', 'none', 'none', 'none', 'Partially Immunized', '2026-10-12')`);
  await db.query(`INSERT INTO allergies (record_id, patient_id, medication_allergies, food_allergies, environmental_allergies, reaction, status, recorded_at) VALUES
    ('AL1', 'P1', 'Penicillin', '', '', 'Rash', 'active', '2026-10-10')`);
  await db.query(`INSERT INTO vital_signs (record_id, patient_id, appointment_id, blood_pressure, temperature, pulse_rate, respiratory_rate, height_cm, weight_kg, bmi, oxygen_saturation, pain_score, recorded_at) VALUES
    ('V1', 'P1', 'A1', '120/80', '36.5', '72', '16', '170', '65', '22.5', '98', '0', '2026-10-10')`);
});

test("aggregate report counts population, visits, and morbidity without names", async () => {
  const res = response();
  await getAggregateReport({ query: { from: "2026-10-01", to: "2026-10-31" } }, res);
  assert.equal(res.code, 200);
  const { demographics, visits, morbidity, programs } = res.data;

  assert.equal(demographics.total, 2);
  assert.equal(demographics.male, 1);
  assert.equal(demographics.female, 1);
  assert.equal(demographics.newPatients, 2);
  const bands = Object.fromEntries(demographics.ageBands.map((b) => [b.label, b.count]));
  assert.equal(bands["25–39"], 1);
  assert.equal(bands["5–14"], 1);
  assert.equal(bands["60+"], 0);

  assert.equal(visits.total, 3);
  assert.equal(visits.completed, 2);
  assert.equal(visits.cancelled, 1);
  assert.equal(visits.patientsServed, 2);
  assert.equal(visits.reasons[0].label, "General Checkup");
  assert.equal(visits.reasons[0].count, 2);

  assert.equal(morbidity[0].label, "Leptospirosis");
  assert.equal(morbidity[0].count, 2);
  assert.equal(morbidity[0].male, 1);
  assert.equal(morbidity[0].female, 1);
  assert.equal(morbidity[1].label, "Hypertension");

  const immune = Object.fromEntries(programs.immunization.map((r) => [r.label, r.count]));
  assert.equal(immune["Up to Date"], 1);
  assert.equal(programs.allergies.medication, 1);
  assert.equal(programs.allergies.food, 0);
  assert.equal(programs.documented, 1);

  // Archived patients and their records never leak in — by count or by name.
  const serialized = JSON.stringify(res.data);
  for (const leaked of ["Zedrick", "Xenia", "Yolanda", "Dengue"]) assert.ok(!serialized.includes(leaked), leaked);
});

test("condition list names only carriers in range, archived excluded", async () => {
  const { getConditionPatients } = vm.runInNewContext(
    `${source.replace(/^import .*;\r?\n/gm, "").replace(/export /g, "")}\n;({ getConditionPatients });`,
    { sql, console }
  );
  const res = response();
  await getConditionPatients({ params: { condition: "leptospirosis" }, query: { from: "2026-10-01", to: "2026-10-31" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.data.patients.length, 2);
  assert.deepEqual(res.data.patients.map((p) => p.first_name).sort(), ["Xenia", "Zedrick"]);
  assert.equal(res.data.patients[0].latest_status, "active");
  const empty = response();
  await getConditionPatients({ params: { condition: "  " }, query: {} }, empty);
  assert.equal(empty.code, 422);
  const none = response();
  await getConditionPatients({ params: { condition: "Dengue" }, query: { from: "2026-10-01", to: "2026-10-31" } }, none);
  assert.equal(none.code, 200);
  assert.equal(none.data.patients.length, 0);
});

test("aggregate report defaults to the last 90 days on bad dates", async () => {
  const res = response();
  await getAggregateReport({ query: { from: "not-a-date", to: "" } }, res);
  assert.equal(res.code, 200);
  assert.match(res.data.filters.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(res.data.filters.to, /^\d{4}-\d{2}-\d{2}$/);
});
