import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, CircleDot, ClipboardList } from "lucide-react";
import { api } from "../../lib/axios";
import { AppointmentDate } from "../appointments/AppointmentDate";
import { ClinicalRecords } from "./ClinicalRecords";
import { RECORD_TYPES } from "../../config/recordTypes";
import { Combobox, Field, Input, Select, Textarea } from "../../components/ui/Input";
import { APPOINTMENT_REASONS } from "../../config/healthOptions";
import { EmptyState, Table, Th, Td, Badge } from "../../components/ui/Table";

const TYPES = ["vital-signs", "health-assessment", "midwife-notes", "medical-history", "allergies"];
const STATUSES = ["confirmed", "cancelled"];
export function AppointmentWorkspace({ patientId, appointments, role, onSaved }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get("appointmentId") || appointments[0]?.appointment_id);
  const [active, setActive] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [recordVersion, setRecordVersion] = useState(0);
  const [statusBusy, setStatusBusy] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { if (params.get("appointmentId")) setSelected(params.get("appointmentId")); }, [params]);
  const appointment = appointments.find(a => a.appointment_id === selected);
  const recording = active === selected && !!appointment && !["completed", "cancelled"].includes(appointment.status);
  const missingRequired = TYPES.flatMap(type => Object.entries(RECORD_TYPES[type].fields)
    .filter(([key, field]) => field.required && !String(drafts[type]?.[key] ?? "").trim())
    .map(([, field]) => `${RECORD_TYPES[type].label}: ${field.label}`));
  const recordingComplete = missingRequired.length === 0;
  function select(a) {
    if (a.appointment_id !== selected) setActive(null);
    setSelected(a.appointment_id);
    const next = new URLSearchParams(params);
    next.set("appointmentId", a.appointment_id);
    setParams(next, { replace: true });
  }
  async function updateStatus(a, status) {
    setStatusBusy(a.appointment_id); setError("");
    try {
      await api.patch(`/appointments/${a.appointment_id}/status`, { status });
      if (["completed", "cancelled"].includes(status) && active === a.appointment_id) setActive(null);
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update the appointment status. Please try again.");
    } finally { setStatusBusy(null); }
  }
  function activate(a) { select(a); setDrafts({}); setError(""); setActive(a.appointment_id); }
  function cancelChanges() { setActive(null); setDrafts({}); setError(""); }
  async function finishRecording(event) {
    event.preventDefault();
    if (!recording || saving) return;
    setError("");
    const records = {};
    for (const type of TYPES) {
      const draft = drafts[type] || {};
      const definition = RECORD_TYPES[type];
      for (const [key, field] of Object.entries(definition.fields)) {
        if (field.required && !String(draft[key] ?? "").trim()) {
          setError(`${definition.label}: ${field.label} is required. Complete all starred fields before finishing.`);
          return;
        }
      }
      records[type] = { ...draft, recordDate: draft.recordDate || String(appointment.scheduled_at).slice(0, 10) };
    }
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/appointments/${selected}/records`, { records });
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save your changes. Your draft is still here; please try again.");
      setSaving(false);
      return;
    }
    setActive(null); setDrafts({}); setRecordVersion(v => v + 1);
    try { await onSaved(); }
    catch { setError("Records saved, but the appointment list could not refresh. Please refresh the page."); }
    finally { setSaving(false); }
  }
  return <div className="ht-appointment-workspace">
    {!recording && <section className="ht-content-card">
      <div className="ht-card-heading"><h2>Appointments</h2>{role === "admin" && <button className="ht-small-button" onClick={() => setShowNew(true)}>+ New Appointment</button>}</div>
      <div className="ht-appointment-scroll" tabIndex="0" aria-label="Patient appointments, scroll for more">
        {!appointments.length ? <EmptyState>No appointments yet.</EmptyState> : <Table>
          <thead><tr><Th>Date and time</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th></tr></thead>
          <tbody>{appointments.map(a => {
            const isActive = active === a.appointment_id && !["completed", "cancelled"].includes(a.status);
            return <tr key={a.appointment_id} className={isActive ? "ht-appointment-row-recording" : selected === a.appointment_id ? "ht-appointment-row-selected" : ""}>
              <Td><button className="ht-link-button" aria-pressed={selected === a.appointment_id} onClick={() => select(a)}><AppointmentDate appointment={a} /></button></Td>
              <Td>{a.reason}</Td>
              <Td>{role === "admin" && a.status !== "completed" ? <Select aria-label={`Appointment status for ${new Date(a.scheduled_at).toLocaleString()}`} value={a.status === "pending" ? "confirmed" : a.status} disabled={statusBusy !== null} className={`ht-status-select ht-status-select-${a.status}`} onChange={e => updateStatus(a, e.target.value)}>
                {STATUSES.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
              </Select> : <Badge>{a.status === "pending" ? "confirmed" : a.status}</Badge>}</Td>
              <Td>{role === "admin" && !["completed", "cancelled"].includes(a.status) && <button className={`ht-small-button${isActive ? " ht-activate-button-active" : ""}`} disabled={isActive || statusBusy !== null} aria-pressed={isActive} onClick={() => activate(a)}>{isActive ? <><CircleDot size={14} /> Recording active</> : "Activate"}</button>}</Td>
            </tr>;
          })}</tbody>
        </Table>}
      </div>
    </section>}
    {!recording && error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
    {appointment && <>
      <section className={`ht-appointment-record ht-appointment-record-compact${recording ? " is-recording" : ""}`} aria-label="Selected appointment record">
        <div className="ht-appointment-record-identity">
          <span className="ht-appointment-record-label"><ClipboardList size={14} /> Appointment record</span>
          <h2>{appointment.reason}</h2>
          <div className="ht-appointment-record-meta"><AppointmentDate appointment={appointment} /><Badge>{appointment.status}</Badge></div>
        </div>
        <div className="ht-appointment-record-controls">
          <span className={`ht-recording-state${recording ? " is-active" : ""}`} role="status">{recording ? <CircleDot size={14} /> : <CheckCircle2 size={14} />}{recording ? "Recording active" : "Viewing record"}</span>
          {!recording && role === "admin" && !["completed", "cancelled"].includes(appointment.status) && <button type="button" className="ht-primary-button" onClick={() => activate(appointment)}>Activate appointment</button>}
        </div>
        {appointment.notes && <p className="ht-appointment-compact-notes">{appointment.notes}</p>}
      </section>
      <form onSubmit={finishRecording} className="ht-recording-form">
      <div className={`ht-clinical-sections${recording ? " is-recording" : ""}`}>
        {TYPES.map(type => <details className="ht-encounter-section" open={recording || undefined} key={`${selected}-${type}-${recording}-${recordVersion}`}>
          <summary><span>{RECORD_TYPES[type].label}</span>{recording && <span className="ht-section-recording-hint">Ready to record</span>}</summary>
          <ClinicalRecords patientId={patientId} appointmentId={selected} appointmentDate={String(appointment.scheduled_at).slice(0, 10)} type={type} role={role} readOnly={!recording} appendOnly embedded draftMode={recording} draft={drafts[type] || {}} onDraftChange={value => setDrafts(previous => ({ ...previous, [type]: value }))} disabled={saving} />
        </details>)}
      </div>
      {recording && <div className="ht-recording-actions">
        {error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
        <span>{recordingComplete ? "All required fields are complete. Finish recording to save and mark this appointment Completed." : `${missingRequired.length} required fields remaining. Complete all starred fields to finish recording.`}</span>
        <div className="ht-form-buttons">
          <button type="button" className="ht-secondary-button" disabled={saving} onClick={cancelChanges}>Cancel changes</button>
          <button type="submit" className="ht-primary-button" disabled={saving || !recordingComplete}>{saving ? "Saving…" : "Finish recording"}</button>
        </div>
      </div>}
      </form>
    </>}
    {showNew && <NewAppointment patientId={patientId} onClose={() => setShowNew(false)} onSaved={async a => { await onSaved(a); activate(a); setShowNew(false); }} />}
  </div>;
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
    try { const {data} = await api.post(`/patients/${patientId}/appointments`, { scheduledAt, reason, notes, status: "confirmed" }); await onSaved(data.appointment); }
    catch(err) { setError(err?.response?.data?.error || "Could not save appointment."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="ht-export-dialog" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><form onSubmit={save}><h2>New Appointment</h2><p>Enter appointment details. Save to activate the appointment and add clinical records.</p>{error && <p role="alert">{error}</p>}<div className="grid gap-4"><Field label="Date and time" required><Input type="datetime-local" required value={scheduledAt} onChange={e => setDate(e.target.value)} /></Field><Field label="Reason" required><Combobox options={reasons} value={reason} required onChange={e => setReason(e.target.value)} /></Field><Field label="Notes"><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></Field><div className="ht-form-buttons"><button type="button" className="ht-secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="ht-primary-button" disabled={busy || !reason.trim() || !scheduledAt}>{busy ? "Saving…" : "Save and activate"}</button></div></div></form></dialog>;
}
