// Pure helpers for the official statistical report (scope A: aggregates only,
// never patient names). No JSX so this module is unit-tested in plain Node.

export const CENTRE_NAME = "Barangay Health Center of Mambog I";

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Dashboard period presets mirrored for the Export dialog, Monday-start weeks.
export function rangeForPeriod(key, now = new Date()) {
  const from = new Date(now);
  if (key === "today") from.setHours(0, 0, 0, 0);
  if (key === "week") { from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); from.setHours(0, 0, 0, 0); }
  if (key === "month") { from.setDate(1); from.setHours(0, 0, 0, 0); }
  if (key === "quarter") { from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1); from.setHours(0, 0, 0, 0); }
  if (key === "year") { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }
  return { from: dayKey(from), to: dayKey(now) };
}

const num = (value) => Number(value || 0);

export function pct(part, total) {
  if (!total) return null;
  return Math.round((num(part) / total) * 100);
}

function topOf(rows) {
  const sorted = [...(rows || [])].sort((a, b) => num(b.count) - num(a.count));
  return num(sorted[0]?.count) > 0 ? sorted[0] : null;
}

// Auto-written generalization of the results: what the numbers mean.
export function buildNarrative(report) {
  if (!report) return [];
  const lines = [];
  const demo = report.demographics || {};
  const visits = report.visits || {};
  const morbidity = report.morbidity || [];
  const programs = report.programs || {};
  const total = num(demo.total);

  if (total > 0) {
    lines.push(
      `The center serves ${total} active patients: ${num(demo.male)} male and ${num(demo.female)} female.` +
      (num(demo.newPatients) > 0 ? ` ${num(demo.newPatients)} newly registered in this period.` : "")
    );
    const topBand = topOf(demo.ageBands);
    if (topBand) lines.push(`The largest age group is ${topBand.label} years with ${num(topBand.count)} patients.`);
  } else {
    lines.push("No active patients are registered for this period.");
  }

  const completed = num(visits.completed);
  if (num(visits.total) > 0) {
    const rate = pct(completed, visits.total);
    lines.push(
      `${num(visits.total)} visits were scheduled and ${completed} completed` +
      (rate === null ? "." : ` (${rate}% completion rate).`) +
      ` ${num(visits.patientsServed)} distinct patients were served.`
    );
    const reason = topOf(visits.reasons);
    if (reason) lines.push(`The leading visit reason is ${reason.label} with ${num(reason.count)} visits.`);
  } else {
    lines.push("No visits were scheduled in this period.");
  }

  const condition = topOf(morbidity);
  if (condition) {
    const assessed = morbidity.reduce((sum, row) => sum + num(row.count), 0);
    const share = pct(condition.count, assessed);
    lines.push(
      `${condition.label} ranks first among recorded conditions with ${num(condition.count)} records` +
      (share === null ? "" : ` (${share}% of assessments)`) +
      `, affecting ${num(condition.male)} males and ${num(condition.female)} females.`
    );
  } else {
    lines.push("No health assessments were recorded in this period.");
  }

  const immunized = topOf(programs.immunization);
  if (immunized) lines.push(`Immunization status is mostly ${immunized.label} (${num(immunized.count)} background records).`);
  if (completed > 0) {
    const docRate = pct(programs.documented, completed);
    if (docRate !== null) lines.push(`${docRate}% of completed visits carry linked medical records.`);
  }
  return lines;
}
