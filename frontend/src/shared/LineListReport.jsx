import { CENTRE_NAME } from "./statisticalReport.js";

// Pure line-list document for one condition in one period. Rendered only
// inside the print shell the Export dialog builds — never in the dashboard.
export function LineListDocument({ condition, from, to, rows, limitNote, generatedAt }) {
  return (
    <article className="ht-stat-report" aria-label={`Patient line list for ${condition}`}>
      <header className="ht-stat-header">
        <h1>{CENTRE_NAME}</h1>
        <p>Patient Line List — {condition}</p>
        <p>Covering {from} to {to}{generatedAt ? ` · Generated ${generatedAt.toLocaleString()}` : ""}</p>
      </header>

      {limitNote && <p className="ht-muted">{limitNote}</p>}
      {!rows?.length
        ? <p className="ht-muted">No patients recorded with this condition in this period.</p>
        : <table className="ht-stat-table">
          <thead><tr><th>#</th><th>Patient</th><th>Sex</th><th>Age</th><th>Latest assessment</th><th>Status</th></tr></thead>
          <tbody>{rows.map((p, i) => (
            <tr key={p.patient_id}>
              <td>{i + 1}</td>
              <td>{p.first_name} {p.middle_name ? `${p.middle_name} ` : ""}{p.last_name}</td>
              <td>{p.sex}</td>
              <td>{p.age}</td>
              <td>{p.latest_assessment}</td>
              <td>{p.latest_status}</td>
            </tr>
          ))}</tbody>
        </table>}

      <footer className="ht-stat-signatures">
        <div><span>Prepared by (Midwife):</span><span className="ht-stat-sigline" /><span>Date: ____________</span></div>
        <div><span>Noted by (Barangay Captain):</span><span className="ht-stat-sigline" /><span>Date: ____________</span></div>
      </footer>
      <p className="ht-stat-footnote">Operational worklist for follow-up use — not the statistical report. Handle according to patient confidentiality rules.</p>
    </article>
  );
}
