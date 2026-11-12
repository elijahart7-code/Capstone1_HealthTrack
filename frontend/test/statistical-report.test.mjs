import test from "node:test";
import assert from "node:assert/strict";
import { buildNarrative, pct } from "../src/shared/statisticalReport.js";

const fixture = {
  demographics: {
    total: 10, male: 4, female: 6, newPatients: 2,
    ageBands: [
      { label: "<1", count: 0 }, { label: "1–4", count: 1 }, { label: "5–14", count: 1 },
      { label: "15–24", count: 2 }, { label: "25–39", count: 4 }, { label: "40–59", count: 2 }, { label: "60+", count: 0 },
    ],
  },
  visits: {
    total: 20, completed: 15, cancelled: 2, patientsServed: 9,
    reasons: [{ label: "General Checkup", count: 12 }, { label: "Vaccination", count: 5 }],
  },
  morbidity: [
    { label: "Leptospirosis", count: 6, male: 4, female: 2 },
    { label: "Hypertension", count: 3, male: 1, female: 2 },
  ],
  programs: {
    immunization: [{ label: "Up to Date", count: 5 }],
    allergies: { medication: 2, food: 1, environmental: 0 },
    documented: 12,
  },
};

test("narrative generalizes males, leading condition, and rates", () => {
  const lines = buildNarrative(fixture).join(" ");
  assert.match(lines, /10 active patients: 4 male and 6 female/);
  assert.match(lines, /largest age group is 25–39/);
  assert.match(lines, /75% completion rate/);
  assert.match(lines, /General Checkup with 12 visits/);
  assert.match(lines, /Leptospirosis ranks first.*6 records.*4 males and 2 females/);
  assert.match(lines, /80% of completed visits carry linked medical records/);
});

test("narrative degrades gracefully on empty periods", () => {
  const lines = buildNarrative({ demographics: {}, visits: {}, morbidity: [], programs: {} }).join(" ");
  assert.match(lines, /No active patients/);
  assert.match(lines, /No visits were scheduled/);
  assert.match(lines, /No health assessments were recorded/);
});

test("narrative never interpolates patient names", () => {
  const serialized = JSON.stringify(buildNarrative(fixture));
  for (const leaked of ["Zedrick", "P1"]) assert.ok(!serialized.includes(leaked));
});

test("pct handles empty denominators", () => {
  assert.equal(pct(3, 0), null);
  assert.equal(pct(1, 2), 50);
});
