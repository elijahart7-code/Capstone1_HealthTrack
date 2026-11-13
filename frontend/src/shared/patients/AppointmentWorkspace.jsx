import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, CheckCircle2, CircleDot, ClipboardList, Trash2 } from "lucide-react";
import { api } from "../../lib/axios";
import { AppointmentDate } from "../appointments/AppointmentDate";
import { AppointmentStatusControl } from "../appointments/AppointmentStatusControl";
import { ClinicalRecords } from "./ClinicalRecords";
import { ClinicalRecordSections } from "./ClinicalRecordSections";
import { RECORD_TYPES } from "../../config/recordTypes";
import { Combobox, Field, Input, Select, Textarea } from "../../components/ui/Input";
import { APPOINTMENT_REASONS } from "../../config/healthOptions";
import { EmptyState, Table, Th, Td } from "../../components/ui/Table";

const TYPES = ["vital-signs", "health-assessment", "midwife-notes", "medical-history", "allergies"];
const STATUSES = ["confirmed", "cancelled"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AppointmentWorkspace({ patientId, appointments, role, onSaved }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get("appointmentId") || appointments[0]?.appointment_id);
  const [active, setActive] = useState(null);
  const [recordExpanded, setRecordExpanded] = useState(false);
  const [recordsRestrictedOpen, setRecordsRestrictedOpen] = useState(false);
  const [isClosingRecordsRestricted, setIsClosingRecordsRestricted] = useState(false);
  const [activationRestrictedOpen, setActivationRestrictedOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [recordVersion, setRecordVersion] = useState(0);
  const [statusBusy, setStatusBusy] = useState(null);
  const [error, setError] = useState("");
  const [appointmentToRemove, setAppointmentToRemove] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const recordsRestrictedCloseTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(recordsRestrictedCloseTimer.current), []);
  useEffect(() => { if (params.get("appointmentId")) setSelected(params.get("appointmentId")); }, [params]);
  const appointment = appointments.find(a => a.appointment_id === selected);
  const appointmentStatus = appointment?.status === "pending" ? "confirmed" : appointment?.status;
  const recording = active === selected && !!appointment && !["completed", "cancelled"].includes(appointment.status);
  const showClinicalRecords = recording || (role === "admin" && appointmentStatus === "completed" && recordExpanded);
  const missingRequired = TYPES.flatMap(type => Object.entries(RECORD_TYPES[type].fields)
    .filter(([key, field]) => field.required && !String(drafts[type]?.[key] ?? "").trim())
    .map(([, field]) => `${RECORD_TYPES[type].label}: ${field.label}`));
  const recordingComplete = missingRequired.length === 0;
  function select(a) {
    if (a.appointment_id !== selected) {
      setActive(null);
      setRecordExpanded(false);
    }
    setSelected(a.appointment_id);
    const next = new URLSearchParams(params);
    next.set("appointmentId", a.appointment_id);
    setParams(next, { replace: true });
  }
  function viewRecords(a) {
    select(a);
    setRecordExpanded(true);
  }
  function openRecordsRestricted() {
    window.clearTimeout(recordsRestrictedCloseTimer.current);
    setIsClosingRecordsRestricted(false);
    setRecordsRestrictedOpen(true);
  }
  function closeRecordsRestricted() {
    if (isClosingRecordsRestricted) return;
    setIsClosingRecordsRestricted(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    recordsRestrictedCloseTimer.current = window.setTimeout(() => {
      setRecordsRestrictedOpen(false);
      setIsClosingRecordsRestricted(false);
    }, reduceMotion ? 0 : 220);
  }
  async function updateStatus(a, status) {
    setStatusBusy(a.appointment_id); setError("");
    try {
      await api.patch(`/appointments/${a.appointment_id}/status`, { status });
      if (["completed", "cancelled"].includes(status)) {
        setRecordExpanded(false);
        if (active === a.appointment_id) setActive(null);
      }
      await onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update the appointment status. Please try again.");
    } finally { setStatusBusy(null); }
  }
  async function removeAppointment() {
    if (!appointmentToRemove || statusBusy !== null) return;
    const removing = appointmentToRemove;
    setStatusBusy(removing.appointment_id);
    setRemoveError("");
    try {
      await api.delete(`/appointments/${removing.appointment_id}`);
      setAppointmentToRemove(null);
      if (active === removing.appointment_id) setActive(null);
      const nextAppointment = appointments.find(item => item.appointment_id !== removing.appointment_id);
      if (selected === removing.appointment_id) {
        setRecordExpanded(false);
        const nextParams = new URLSearchParams(params);
        if (nextAppointment) {
          setSelected(nextAppointment.appointment_id);
          nextParams.set("appointmentId", nextAppointment.appointment_id);
        } else {
          setSelected(null);
          nextParams.delete("appointmentId");
        }
        setParams(nextParams, { replace: true });
      }
      try {
        await onSaved();
      } catch {
        setError("Appointment removed, but the list could not refresh. Please refresh the page.");
      }
    } catch (err) {
      setRemoveError(err?.response?.data?.error || "Could not remove the cancelled appointment.");
    } finally {
      setStatusBusy(null);
    }
  }
  function activate(a) { select(a); setRecordExpanded(false); setDrafts({}); setError(""); setActive(a.appointment_id); }
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
    setActive(null); setRecordExpanded(false); setDrafts({}); setRecordVersion(v => v + 1);
    try { await onSaved(); }
    catch { setError("Records saved, but the appointment list could not refresh. Please refresh the page."); }
    finally { setSaving(false); }
  }
  return <div className="ht-appointment-workspace">
    {!recording && <section className="ht-content-card">
      <div className="ht-card-heading"><h2 className="ht-appointments-heading"><CalendarDays size={22} aria-hidden="true" />Appointments</h2>{role === "admin" && <button className="ht-primary-button ht-new-appointment-button ht-button-mint" onClick={() => setShowNew(true)}>+ New Appointment</button>}</div>
      <div className="ht-appointment-scroll" tabIndex="0" aria-label="Patient appointments, scroll for more">
        {!appointments.length ? <EmptyState>No appointments yet.</EmptyState> : <Table>
          <thead><tr><Th>Date and Time</Th><Th>Reason</Th><Th>Status</Th><Th>Action</Th></tr></thead>
          <tbody>{appointments.map(a => {
            const isActive = active === a.appointment_id && !["completed", "cancelled"].includes(a.status);
            const status = a.status === "pending" ? "confirmed" : a.status;
            const statusClass = role === "health_worker"
              ? `ht-appointment-record-status ht-appointment-record-status-${status}`
              : `ht-appointment-status ht-appointment-status-${status}`;
            return <tr key={a.appointment_id} className={isActive ? "ht-appointment-row-recording" : selected === a.appointment_id ? "ht-appointment-row-selected" : ""}>
              <Td><button className="ht-link-button" aria-pressed={selected === a.appointment_id} onClick={() => select(a)}><AppointmentDate appointment={a} /></button></Td>
              <Td><button type="button" className="ht-appointment-reason-select" aria-pressed={selected === a.appointment_id} onClick={() => select(a)}>{a.reason}</button></Td>
              <Td>{role === "admin" ? <AppointmentStatusControl
                appointmentId={a.appointment_id}
                label={new Date(a.scheduled_at).toLocaleString()}
                status={status}
                disabled={statusBusy !== null}
                onChange={(nextStatus) => updateStatus(a, nextStatus)}
              /> : <span className={statusClass}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>}</Td>
              {role === "health_worker" ? (
                <Td><span className="ht-appointment-record-restricted">Records Restricted</span></Td>
              ) : role === "admin" ? (
                <Td>
                  {a.status === "completed" ? (
                    <button type="button" className="ht-appointment-action ht-appointment-action-completed" onClick={() => viewRecords(a)}>
                      <CheckCircle2 size={14} /> Successful
                    </button>
                  ) : a.status === "cancelled" ? (
                    <button type="button" className="ht-appointment-action ht-appointment-action-cancelled" disabled={statusBusy !== null} onClick={() => { setRemoveError(""); setAppointmentToRemove(a); }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  ) : (
                    <button className={`ht-appointment-action ht-appointment-action-confirmed${isActive ? " is-active" : ""}`} disabled={isActive || statusBusy !== null} aria-pressed={isActive} onClick={() => activate(a)}>
                      {isActive ? <><CircleDot size={14} />Recording active</> : "Activate"}
                    </button>
                  )}
                </Td>
              ) : <Td />}
            </tr>;
          })}</tbody>
        </Table>}
      </div>
    </section>}
    {!recording && error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
    {appointment && <>
      <section className={`ht-appointment-record ht-appointment-record-compact${recording ? " is-recording" : ""}`} aria-label="Selected appointment record">
        <div className="ht-appointment-record-title-line">
          <span className="ht-appointment-record-label"><ClipboardList size={20} /> CONSULTATION RECORD</span>
          <div className="ht-appointment-record-reason-group">
            <h2 className="ht-appointment-record-reason">{appointment.reason}</h2>
            <span className={`ht-appointment-record-status ht-appointment-record-status-${appointmentStatus}`}>
              {appointmentStatus.charAt(0).toUpperCase() + appointmentStatus.slice(1)}
            </span>
          </div>
          <div className="ht-appointment-record-meta">
            <AppointmentDate appointment={appointment} />
          </div>
          {appointment.notes && <p className="ht-appointment-compact-notes">{appointment.notes}</p>}
        </div>
        <div className="ht-appointment-record-controls">
          {recording ? (
            <span className="ht-recording-state is-active" role="status"><CircleDot size={14} />Recording active</span>
          ) : appointmentStatus === "completed" ? (
            <button
              type="button"
              className="ht-appointment-record-view-button"
              aria-expanded={role === "admin" ? recordExpanded : undefined}
              onClick={() => {
                if (role === "health_worker") {
                  openRecordsRestricted();
                  return;
                }
                setRecordExpanded(expanded => !expanded);
              }}
            >
              <CheckCircle2 size={14} />{recordExpanded ? "Hide Record" : "View Record"}
            </button>
          ) : appointmentStatus === "cancelled" ? (
            <button
              type="button"
              className="ht-appointment-no-records"
              disabled={role !== "health_worker"}
              onClick={openRecordsRestricted}
            >
              No Record
            </button>
          ) : role === "admin" ? (
            <button type="button" className="ht-appointment-record-activate-button" onClick={() => activate(appointment)}>Activate</button>
          ) : role === "health_worker" ? (
            <button type="button" className="ht-appointment-record-activate-button" onClick={() => setActivationRestrictedOpen(true)}>Activate</button>
          ) : null}
        </div>
      {showClinicalRecords && <form onSubmit={finishRecording} className="ht-recording-form">
      <ClinicalRecordSections
        sections={TYPES.map(type => ({ key: type, label: RECORD_TYPES[type].label }))}
        expanded={recording}
        resetKey={`${selected}-${recording}-${recordVersion}`}
        className={recording ? "is-recording" : ""}
        renderSection={type => (
          <ClinicalRecords
            patientId={patientId}
            appointmentId={selected}
            appointmentDate={String(appointment.scheduled_at).slice(0, 10)}
            type={type}
            role={role}
            readOnly={!recording}
            appendOnly
            embedded
            draftMode={recording}
            draft={drafts[type] || {}}
            onDraftChange={value => setDrafts(previous => ({ ...previous, [type]: value }))}
            disabled={saving}
          />
        )}
      />
      {recording && <div className="ht-recording-actions">
        {error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
        <span>{recordingComplete ? "All required fields are complete. Finish recording to save and mark this appointment Completed." : `${missingRequired.length} required fields remaining. Complete all starred fields to finish recording.`}</span>
        <div className="ht-form-buttons">
          <button type="button" className="ht-secondary-button" disabled={saving} onClick={cancelChanges}>Cancel changes</button>
          <button type="submit" className="ht-primary-button" disabled={saving || !recordingComplete}>{saving ? "Saving…" : "Finish recording"}</button>
        </div>
      </div>}
      </form>
      }
      </section>
    </>}
    {showNew && <NewAppointment patientId={patientId} onClose={() => setShowNew(false)} onSaved={async a => { await onSaved(a); activate(a); setShowNew(false); }} />}
    {appointmentToRemove && <div className="ht-confirm-backdrop ht-archive-confirm-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && statusBusy === null) setAppointmentToRemove(null);
    }}>
      <section className="ht-confirm-dialog ht-archive-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-appointment-title">
        <h2 id="remove-appointment-title">Remove Appointment?</h2>
        <p className="ht-confirm-message">Are you sure you want to remove this Cancelled Appointment scheduled for {new Date(appointmentToRemove.scheduled_at).toLocaleString()}? This action cannot be undone. Read it carefully.</p>
        {removeError && <p className="ht-confirm-error" role="alert">{removeError}</p>}
        <div className="ht-confirm-actions ht-archive-confirm-actions">
          <button type="button" className="ht-confirm-cancel" disabled={statusBusy !== null} onClick={() => setAppointmentToRemove(null)}>Cancel</button>
          <button type="button" className="ht-confirm-submit" disabled={statusBusy !== null} onClick={removeAppointment}>{statusBusy !== null ? "Removing..." : "Remove"}</button>
        </div>
      </section>
    </div>}
    {recordsRestrictedOpen && role === "health_worker" && (
      <div
        className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingRecordsRestricted ? "is-closing" : ""}`}
        onMouseDown={event => {
          if (event.target === event.currentTarget) closeRecordsRestricted();
        }}
      >
        <section
          className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingRecordsRestricted ? "is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="records-restricted-title"
        >
          <p id="records-restricted-title" className="ht-confirm-message">Patient Records are Restricted!</p>
          <div className="ht-confirm-actions ht-archive-confirm-actions">
            <button type="button" className="ht-confirm-submit ht-appointment-restricted-exit" onClick={closeRecordsRestricted}>
              Exit
            </button>
          </div>
        </section>
      </div>
    )}
    {activationRestrictedOpen && role === "health_worker" && (
      <div
        className="ht-confirm-backdrop ht-archive-confirm-backdrop"
        onMouseDown={event => {
          if (event.target === event.currentTarget) setActivationRestrictedOpen(false);
        }}
      >
        <section
          className="ht-confirm-dialog ht-archive-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activation-restricted-title"
        >
          <h2 id="activation-restricted-title">Cannot Activate</h2>
          <p className="ht-confirm-message">Only the midwife can perform the health assessment.</p>
          <div className="ht-confirm-actions ht-archive-confirm-actions">
            <button type="button" className="ht-confirm-submit" onClick={() => setActivationRestrictedOpen(false)}>
              Okay
            </button>
          </div>
        </section>
      </div>
    )}
  </div>;
}
function NewAppointment({ patientId, onClose, onSaved }) {
  const dialog = useRef(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState(APPOINTMENT_REASONS);
  const scheduledAt = selectedDate
    ? `${selectedDate}T${String((Number(hour) % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute}`
    : "";
  const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - firstDayOfMonth.getDay());
  const dayCount = Math.ceil((firstDayOfMonth.getDay() + new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()) / 7) * 7;
  const calendarDays = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index);
    return { date, value: localDateValue(date), inMonth: date.getMonth() === calendarMonth.getMonth() };
  });
  useEffect(() => { dialog.current.showModal(); api.get("/patients/options").then(({data}) => { if (data.options?.appointment_reasons?.length) setReasons(data.options.appointment_reasons); }).catch(() => {}); }, []);
  function chooseDate(value) {
    setSelectedDate(value);
    const [year, month] = value.split("-").map(Number);
    setCalendarMonth(new Date(year, month - 1, 1));
  }
  async function save(e) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { const {data} = await api.post(`/patients/${patientId}/appointments`, { scheduledAt, reason, notes, status: "confirmed" }); await onSaved(data.appointment); }
    catch(err) { setError(err?.response?.data?.error || "Could not save appointment."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="ht-export-dialog ht-new-appointment-dialog" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}>
    <form onSubmit={save}>
      <h2>New Appointment</h2>
      <p>Enter appointment details. Save to activate the appointment and add clinical records.</p>
      {error && <p role="alert">{error}</p>}
      <div className="grid gap-4 ht-appointment-form-fields">
        <div className="ht-field ht-appointment-datetime-field">
          <span>Date and Time<span style={{ color: "var(--color-danger)" }}>*</span></span>
          <div className="ht-appointment-datetime" aria-required="true">
            <section className="ht-appointment-calendar" aria-label="Choose appointment date">
              <div className="ht-appointment-calendar-heading">
                <strong>Select date</strong>
                <span>{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Choose a day"}</span>
              </div>
              <div className="ht-appointment-calendar-month">
                <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
                <strong>{calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
                <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
              </div>
              <div className="ht-appointment-calendar-grid" role="grid" aria-label={calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}>
                {WEEKDAYS.map(day => <span className="ht-appointment-weekday" key={day}>{day}</span>)}
                {calendarDays.map(({ date, value, inMonth }) => (
                  <button
                    type="button"
                    role="gridcell"
                    key={value}
                    aria-label={date.toLocaleDateString(undefined, { dateStyle: "full" })}
                    aria-pressed={selectedDate === value}
                    className={`ht-appointment-calendar-day${inMonth ? "" : " is-outside"}${selectedDate === value ? " is-selected" : ""}`}
                    onClick={() => chooseDate(value)}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </section>
            <section className="ht-appointment-time" aria-label="Choose appointment time">
              <div className="ht-appointment-calendar-heading">
                <strong>Set time</strong>
                <span>{hour}:{minute} {period}</span>
              </div>
              <div className="ht-appointment-time-fields">
                <div>
                  <span>Hour</span>
                  <Select aria-label="Appointment hour" value={hour} onChange={event => setHour(event.target.value)}>
                    {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map(value => <option key={value} value={value}>{value}</option>)}
                  </Select>
                </div>
                <div>
                  <span>Minute</span>
                  <Select aria-label="Appointment minute" value={minute} onChange={event => setMinute(event.target.value)}>
                    {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map(value => <option key={value} value={value}>{value}</option>)}
                  </Select>
                </div>
                <div>
                  <span>Period</span>
                  <Select aria-label="AM or PM" value={period} onChange={event => setPeriod(event.target.value)}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </Select>
                </div>
              </div>
              <p className="ht-appointment-time-hint">Choose the time for this appointment.</p>
            </section>
            <Field label="Reason" required className="ht-appointment-reason-field">
              <Combobox options={reasons} value={reason} required onChange={event => setReason(event.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Notes" className="ht-appointment-notes-field"><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        <div className="ht-form-buttons ht-appointment-form-actions"><button className="ht-primary-button ht-button-mint" disabled={busy || !reason.trim() || !scheduledAt}>{busy ? "Saving…" : "Save & Activate"}</button><button type="button" className="ht-secondary-button ht-appointment-cancel-button" disabled={busy} onClick={onClose}>Cancel</button></div>
      </div>
    </form>
  </dialog>;
}
