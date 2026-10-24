import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RECORD_TYPES } from "../config/recordTypes";
import { api } from "../lib/axios";

export function ExportDialog({ title, sections, initialSelected, onClose }) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(initialSelected || sections.map(s => s.key));
  const [limit, setLimit] = useState(50);
  const [periods, setPeriods] = useState(() => Object.fromEntries(sections.filter(s => s.periods).map(s => [s.key, s.defaultPeriod || s.periods[0].key])));
  const [printing, setPrinting] = useState(false);
  useEffect(() => { dialog.current.showModal(); }, []);
  useEffect(() => {
    if (!printing) return;
    const done = () => { document.body.classList.remove("ht-exporting"); setPrinting(false); };
    document.body.classList.add("ht-exporting");
    window.addEventListener("afterprint", done);
    const timer = setTimeout(() => window.print(), 150);
    return () => { clearTimeout(timer); window.removeEventListener("afterprint", done); document.body.classList.remove("ht-exporting"); };
  }, [printing]);
  return <>
    <dialog ref={dialog} className="ht-export-dialog" onCancel={onClose}>
      <h2>{title}</h2><p>Select sections and the maximum rows per section. Rows are exported newest first.</p>
      <div className="ht-export-options">{sections.map(s => {
        const checkbox = <label key={s.key}><input type="checkbox" checked={selected.includes(s.key)} onChange={e => setSelected(v => e.target.checked ? [...v, s.key] : v.filter(k => k !== s.key))} /> {s.label}</label>;
        return s.periods ? <div className="ht-export-option-row" key={s.key}>{checkbox}<select aria-label={`${s.label} period`} value={periods[s.key]} onChange={e => setPeriods(previous => ({ ...previous, [s.key]: e.target.value }))}>{s.periods.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div> : checkbox;
      })}</div>
      <label className="ht-export-limit">Maximum rows per section <input aria-label="Maximum rows per section" type="number" min="1" max="1000" value={limit} onChange={e => setLimit(e.target.value)} /></label>
      <p>Charts and summary counts include the full stated reporting period. Detail lists use the row limit. Choose “Save as PDF” in the print dialog.</p>
      <div className="ht-form-buttons"><button className="ht-secondary-button" onClick={onClose}>Cancel</button><button className="ht-primary-button ht-export-pdf-button" disabled={!selected.length || !Number.isInteger(Number(limit)) || limit < 1 || limit > 1000} onClick={() => setPrinting(true)}>Print / Save PDF</button></div>
    </dialog>
    {printing && createPortal(<article className="ht-export-document">
      <header className="ht-export-heading"><span className="ht-export-brand">HealthTrack</span><h1>{title}</h1><p>Generated {new Date().toLocaleString()} · Maximum {limit} rows per section</p></header>
      {sections.filter(s => selected.includes(s.key)).map((s, index) => <section className="ht-export-section" data-report-section={s.key} key={s.key}>
        <h2 className="ht-export-section-title"><span>{String(index + 1).padStart(2, "0")}</span>{s.label}{s.periods && ` — ${s.periods.find(p => p.key === periods[s.key])?.label}`}</h2>
        {s.render(Number(limit), periods[s.key])}
      </section>)}
    </article>, document.body)}
  </>;
}

export function PatientExportButton({ patient }) {
  const [records, setRecords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setBusy(true); setError("");
    try {
      const entries = await Promise.all(Object.keys(RECORD_TYPES).map(async type => [type, (await api.get(`/patients/${patient.patient_id}/records/${type}`, { params: { perPage: 1000 } })).data.records]));
      const { data } = await api.get(`/patients/${patient.patient_id}/appointments`);
      setRecords({ ...Object.fromEntries(entries), appointments: data.appointments });
    } catch { setError("Could not load patient report. Please try again."); }
    finally { setBusy(false); }
  }
  const name = patient.full_name || `${patient.last_name}, ${patient.first_name}`;
  const sections = records ? [
    { key: "profile", label: "Patient information", render: () => <dl>{["patient_id", "birthdate", "sex", "address", "contact_number", "blood_type", "emergency_contact_name", "emergency_contact_number"].map(k => <div key={k}><dt>{k.replaceAll("_", " ")}</dt><dd>{patient[k] || "—"}</dd></div>)}</dl> },
    { key: "appointments", label: "Appointments", render: limit => <><p>{Math.min(limit, records.appointments.length)} of {records.appointments.length} appointments</p><table><thead><tr><th>Date</th><th>Reason</th><th>Status</th><th>Notes</th></tr></thead><tbody>{records.appointments.slice(0, limit).map(a => <tr key={a.appointment_id}><td>{new Date(a.scheduled_at).toLocaleString()}</td><td>{a.reason}</td><td>{a.status}</td><td>{a.notes}</td></tr>)}</tbody></table></> },
    ...Object.entries(RECORD_TYPES).map(([type, def]) => ({ key: type, label: def.label, render: limit => <><p>Showing {Math.min(limit, records[type].length)} of {records[type].length}{records[type].length === 1000 ? "+" : ""} loaded records</p>{records[type].slice(0, limit).map(r => <div className="ht-export-record" key={r.record_id}><h3>{String(r[def.dateField]).slice(0,10)} · {r.appointment_id || "Earlier history (not linked to an appointment)"}</h3><dl>{Object.entries(def.fields).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{field.options?.[r[key]] || r[key] || "—"}</dd></div>)}</dl></div>)}</> }))
  ] : [];
  return <><button className="ht-export-pdf-button" disabled={busy} onClick={open}><Download size={14} />{busy ? "Loading…" : "Export PDF"}</button>{error && <span role="alert">{error}</span>}{records && <ExportDialog title={`Patient report — ${name}`} sections={sections} initialSelected={["profile", "appointments"]} onClose={() => setRecords(null)} />}</>;
}
