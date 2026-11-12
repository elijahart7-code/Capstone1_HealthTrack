import { CENTRE_NAME, buildNarrative, pct } from "./statisticalReport.js";

function Section({ id, title, children }) {
  return <section className="ht-stat-section"><h2>{id}. {title}</h2>{children}</section>;
}

function CountTable({ headers, rows, empty }) {
  if (!rows?.length) return <p className="ht-muted">{empty}</p>;
  return <table className="ht-stat-table">
    <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}

// Pure document: aggregate counts only, no patient names by construction.
// sections toggles which parts print — driven by the Export PDF dialog.
export const ALL_SECTIONS = { population: true, visits: true, morbidity: true, programs: true, narrative: true };

export function StatisticalDocument({ report, generatedAt, sections = ALL_SECTIONS }) {
  if (!report) return null;
  const demo = report.demographics || {};
  const visits = report.visits || {};
  const totalAssessments = (report.morbidity || []).reduce((s, r) => s + Number(r.count || 0), 0);
  const narratives = buildNarrative(report);

  return (
    <article className="ht-stat-report" aria-label="Barangay statistical health report">
      <header className="ht-stat-header">
        <h1>{CENTRE_NAME}</h1>
        <p>Barangay Statistical Health Report</p>
        <p>Covering {report.filters.from} to {report.filters.to}{generatedAt ? ` · Generated ${generatedAt.toLocaleString()}` : ""}</p>
      </header>

      {sections.population && (
        <Section id="A" title={`Population served (${demo.total || 0} active patients)`}>
          <CountTable headers={["Group", "Count", "Share"]} rows={[
            ["Male", demo.male, pct(demo.male, demo.total) === null ? "—" : `${pct(demo.male, demo.total)}%`],
            ["Female", demo.female, pct(demo.female, demo.total) === null ? "—" : `${pct(demo.female, demo.total)}%`],
            ["Newly registered in period", demo.newPatients, "—"],
          ]} empty="No population data." />
          <h3>Age distribution</h3>
          <CountTable headers={["Age band", "Count"]} rows={(demo.ageBands || []).map((b) => [b.label, b.count])} empty="No age data." />
        </Section>
      )}

      {sections.visits && (
        <Section id="B" title={`Visit volume (${visits.total || 0} scheduled)`}>
          <CountTable headers={["Measure", "Count"]} rows={[
            ["Completed visits", visits.completed],
            ["Cancelled visits", visits.cancelled],
            ["Distinct patients served", visits.patientsServed],
            ["Completion rate", pct(visits.completed, visits.total) === null ? "—" : `${pct(visits.completed, visits.total)}%`],
          ]} empty="No visit data." />
          <h3>Leading visit reasons</h3>
          <CountTable headers={["Reason", "Visits"]} rows={(visits.reasons || []).map((r) => [r.label, r.count])} empty="No visit reasons recorded." />
        </Section>
      )}

      {sections.morbidity && (
        <Section id="C" title="Morbidity profile (recorded conditions)">
          <CountTable headers={["Condition", "Records", "Share", "Male", "Female"]} rows={(report.morbidity || []).map((m) => [
            m.label, m.count,
            pct(m.count, totalAssessments) === null ? "—" : `${pct(m.count, totalAssessments)}%`,
            m.male, m.female,
          ])} empty="No assessments recorded in this period." />
        </Section>
      )}

      {sections.programs && (
        <Section id="D" title="Program signals">
          <h3>Immunization status mix</h3>
          <CountTable headers={["Status", "Records"]} rows={(report.programs?.immunization || []).map((r) => [r.label, r.count])} empty="No background records in this period." />
          <h3>Allergy records on file</h3>
          <CountTable headers={["Category", "Records"]} rows={[
            ["Medication", report.programs?.allergies?.medication || 0],
            ["Food", report.programs?.allergies?.food || 0],
            ["Environmental", report.programs?.allergies?.environmental || 0],
          ]} empty="No allergy records." />
          <p>Completed visits with linked medical records: {report.programs?.documented || 0} of {visits.completed || 0}.</p>
        </Section>
      )}

      {sections.narrative && (
        <Section id="E" title="Generalization of results">
          {narratives.length ? <ol className="ht-stat-narrative">{narratives.map((line, i) => <li key={i}>{line}</li>)}</ol> : <p className="ht-muted">No data to generalize for this period.</p>}
        </Section>
      )}

      <footer className="ht-stat-signatures">
        <div><span>Prepared by (Midwife):</span><span className="ht-stat-sigline" /><span>Date: ____________</span></div>
        <div><span>Noted by (Barangay Captain):</span><span className="ht-stat-sigline" /><span>Date: ____________</span></div>
      </footer>
      <p className="ht-stat-footnote">HealthTrack statistical report — aggregate counts only, no patient names. For barangay health planning use.</p>
    </article>
  );
}
