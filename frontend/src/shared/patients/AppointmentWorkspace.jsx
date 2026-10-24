import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../../lib/axios";
import { ClinicalRecords } from "./ClinicalRecords";
import { RECORD_TYPES } from "../../config/recordTypes";
import { Combobox, Field, Input, Textarea } from "../../components/ui/Input";
import { APPOINTMENT_REASONS } from "../../config/healthOptions";
import { EmptyState, Table, Th, Td, Badge } from "../../components/ui/Table";

const TYPES = ["vital-signs", "health-assessment", "midwife-notes", "medical-history", "allergies"];
export function AppointmentWorkspace({ patientId, appointments, role, onSaved }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get("appointmentId") || appointments[0]?.appointment_id);
  const [active, setActive] = useState(null);
  const [showNew, setShowNew] = useState(false);
  useEffect(() => { if (params.get("appointmentId")) setSelected(params.get("appointmentId")); }, [params]);
  const appointment = appointments.find(a => a.appointment_id === selected);
  function select(a) {
    setSelected(a.appointment_id); setActive(null);
    const next = new URLSearchParams(params); next.set("appointmentId", a.appointment_id); setParams(next, { replace: true });
  }
  return <div>
    <section className="ht-content-card"><div className="ht-card-heading"><h2>Appointments</h2>{role === "admin" && <button className="ht-small-button" onClick={() => setShowNew(true)}>+ New Appointment</button>}</div>
      <div className="ht-appointment-scroll" tabIndex="0" aria-label="Patient appointments, scroll for more">
      {!appointments.length ? <EmptyState>No appointments yet.</EmptyState> : <Table><thead><tr><Th>Date and time</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th></tr></thead><tbody>{appointments.map(a => <tr key={a.appointment_id} style={selected === a.appointment_id ? { background: "#e2f2ea" } : {}}><Td><button className="ht-link-button" aria-pressed={selected === a.appointment_id} onClick={() => select(a)}>{new Date(a.scheduled_at).toLocaleString()}</button></Td><Td>{a.reason}</Td><Td><Badge>{a.status}</Badge></Td><Td>{role === "admin" && a.status !== "cancelled" && a.status !== "completed" && <button className="ht-small-button" onClick={() => { select(a); setActive(a.appointment_id); }}>Activate</button>}</Td></tr>)}</tbody></Table>}
      </div>
    </section>
    {appointment && <>
      <section className="ht-content-card" style={{ marginTop: 14 }}><h2>Appointment record · {new Date(appointment.scheduled_at).toLocaleString()}</h2><p>{appointment.reason} · {appointment.status}</p>{appointment.notes && <p>{appointment.notes}</p>}<p className="ht-muted">{active === selected ? "Active appointment: add clinical records below. Each saved section is preserved with this appointment." : "Showing records recorded for this appointment. Activate to add clinical information."}</p>{active === selected && <button className="ht-secondary-button" onClick={() => setActive(null)}>Finish recording</button>}</section>
      {TYPES.map(type => <details className="ht-encounter-section" open key={`${selected}-${type}`}><summary>{RECORD_TYPES[type].label}</summary><ClinicalRecords patientId={patientId} appointmentId={selected} appointmentDate={String(appointment.scheduled_at).slice(0, 10)} type={type} role={role} readOnly={active !== selected} appendOnly /></details>)}
    </>}
    <details className="ht-encounter-section"><summary>Earlier clinical history</summary><p>These records predate appointment linking. They are not assigned to the selected appointment.</p>{TYPES.map(type => <LegacyRecords key={type} patientId={patientId} type={type} />)}</details>
    {showNew && <NewAppointment patientId={patientId} onClose={() => setShowNew(false)} onSaved={async a => { setShowNew(false); await onSaved(); setSelected(a.appointment_id); setActive(a.appointment_id); }} />}
  </div>;
}
function LegacyRecords({ patientId, type }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { let alive = true; api.get(`/patients/${patientId}/records/${type}`, { params: { perPage: 1000 } }).then(({data}) => { if (alive) setRecords(data.records.filter(r => !r.appointment_id)); }).catch(() => { if (alive) setError(true); }); return () => { alive = false; }; }, [patientId, type]);
  const def = RECORD_TYPES[type];
  return <details className="ht-encounter-section"><summary>{def.label}</summary>{error ? <p role="alert">Could not load earlier records.</p> : records === null ? <p>Loading…</p> : !records.length ? <p>No earlier records.</p> : records.map(r => <section key={r.record_id}><h3>{String(r[def.dateField]).slice(0,10)}</h3><dl>{Object.entries(def.fields).map(([key,field]) => <div key={key}><dt>{field.label}</dt><dd>{field.options?.[r[key]] || r[key] || "—"}</dd></div>)}</dl></section>)}</details>;
}
function NewAppointment({ patientId, onClose, onSaved }) {
  const dialog = useRef(null);
  const [scheduledAt, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState(APPOINTMENT_REASONS);
  useEffect(() => { dialog.current.showModal(); api.get("/patients/options").then(({data}) => { if (data.options?.appointment_reasons?.length) setReasons(data.options.appointment_reasons); }).catch(() => {}); }, []);
  async function save(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { const {data} = await api.post(`/patients/${patientId}/appointments`, { scheduledAt, reason, notes, status: "pending" }); await onSaved(data.appointment); }
    catch(err) { setError(err?.response?.data?.error || "Could not save appointment."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="ht-export-dialog" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><form onSubmit={save}><h2>New Appointment</h2><p>Enter appointment details. Save to activate the appointment and add clinical records.</p>{error && <p role="alert">{error}</p>}<div className="grid gap-4"><Field label="Date and time" required><Input type="datetime-local" required value={scheduledAt} onChange={e => setDate(e.target.value)} /></Field><Field label="Reason" required><Combobox options={reasons} value={reason} required onChange={e => setReason(e.target.value)} /></Field><Field label="Notes"><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></Field><div className="ht-form-buttons"><button type="button" className="ht-secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="ht-primary-button" disabled={busy || !reason.trim() || !scheduledAt}>{busy ? "Saving…" : "Save and activate"}</button></div></div></form></dialog>;
}
