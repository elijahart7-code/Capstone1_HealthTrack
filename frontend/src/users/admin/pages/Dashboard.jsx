import { ReportInsights, ReportMetrics } from "../../../shared/ReportInsights";
import { AppointmentDate } from "../../../shared/appointments/AppointmentDate";
import { ExportDialog } from "../../../shared/ExportDialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Syringe,
  Users,
} from "lucide-react";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatCard } from "../../../components/ui/Card";
import { Select } from "../../../components/ui/Input";
import { Badge, EmptyState, Table, Th, Td } from "../../../components/ui/Table";

const STATUSES = ["confirmed", "cancelled"];
const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

function ReportList({ title, icon: Icon, rows }) {
  return (
    <div className="ht-report-list">
      <h4><Icon size={16} /> {title}</h4>
      {rows.length ? rows.map(([label, count]) => (
        <div className="ht-report-list-row" key={label}>
          <span>{label}</span><strong>{count}</strong>
        </div>
      )) : <span className="ht-muted text-sm">No recorded data</span>}
    </div>
  );
}

function ReportBarChart({ title, rows = [], color = "var(--color-brand-strong)" }) {
  const max = Math.max(...rows.map(([, count]) => count), 1);
  return (
    <div className="ht-chart-card">
      <h3>{title}</h3>
      {!rows.length ? <EmptyState>No data for this range.</EmptyState> : (
        <div className="ht-bar-chart">
          {rows.map(([label, count]) => (
            <div className="ht-bar-row" key={label}>
              <span title={label}>{label}</span>
              <div className="ht-bar-track"><i style={{ width: `${(count / max) * 100}%`, background: color }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTrendLabel(value, hourly = false) {
  if (!value) return "";
  const date = new Date(hourly ? String(value) : `${String(value).slice(0, 10)}T00:00:00`);
  if (hourly) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ReportTrendChart({ rows = [], compact = false, hourly = false }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...rows.map((row) => Number(row.total)), 2);
  const width = 640;
  const height = 250;
  const left = 48;
  const right = 18;
  const top = 24;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * plotWidth + left;
    const y = top + plotHeight - (row.total / max) * plotHeight;
    return { ...row, x, y };
  });
  return (
    <div className={`ht-chart-card${compact ? " ht-chart-card-compact" : ""}`}>
      <h3>Appointment activity</h3>
      {!rows.length ? <EmptyState>No appointments for this range.</EmptyState> : (
        <svg className="ht-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Appointment activity trend with dates and appointment counts">
          {[0, .5, 1].map((fraction) => {
            const y = top + plotHeight - fraction * plotHeight;
            const value = Math.round(max * fraction);
            return (
              <g key={fraction}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="currentColor" opacity=".15" />
                <text x={left - 8} y={y + 4} textAnchor="end" className="ht-chart-axis-label">{value}</text>
              </g>
            );
          })}
          <line x1={left} y1={top + plotHeight} x2={width - right} y2={top + plotHeight} stroke="currentColor" opacity=".35" />
          <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="currentColor" opacity=".35" />
          <text x={12} y={top - 8} className="ht-chart-axis-title">Appointments</text>
          <text x={width - right} y={height - 8} textAnchor="end" className="ht-chart-axis-title">Date</text>
          <polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="var(--color-brand-strong)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((row, index) => (
            <g key={row.period} onMouseEnter={() => setHovered({ ...row, index })} onMouseLeave={() => setHovered(null)}>
              <circle cx={row.x} cy={row.y} r="5" fill="var(--color-brand-strong)"><title>{formatTrendLabel(row.period, hourly)}: {row.total} appointments, {row.completed} completed</title></circle>
              <circle cx={row.x} cy={row.y} r="14" fill="transparent" />
              {(index === 0 || index === points.length - 1 || points.length <= 8 || index % Math.max(1, Math.ceil(points.length / 5)) === 0) && (
                <text x={row.x} y={height - 24} textAnchor="middle" className="ht-chart-axis-label">
                  {formatTrendLabel(row.period, hourly)}
                </text>
              )}
            </g>
          ))}
          {hovered && (
            <g pointerEvents="none">
              <rect x={Math.min(Math.max(hovered.x - 78, left), width - right - 156)} y={Math.max(hovered.y - 58, 4)} width="156" height="44" rx="6" className="ht-chart-tooltip" />
              <text x={Math.min(Math.max(hovered.x, left + 78), width - right - 78)} y={Math.max(hovered.y - 36, 20)} textAnchor="middle" className="ht-chart-tooltip-text">
                {formatTrendLabel(hovered.period, hourly)}: {hovered.total} appointments
              </text>
              <text x={Math.min(Math.max(hovered.x, left + 78), width - right - 78)} y={Math.max(hovered.y - 20, 36)} textAnchor="middle" className="ht-chart-tooltip-text">
                Completed: {hovered.completed}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

function normalizeRows(rows = []) {
  return rows.map((row) => [row.label, Number(row.count)]);
}

function FollowUpPatients({ patients, onPatientClick }) {
  if (!patients?.length) return <EmptyState>No patients currently flagged for follow-up.</EmptyState>;

  return (
    <div className="ht-follow-up-list">
      {patients.map((patient) => (
        <button
          type="button"
          className="ht-follow-up-item"
          key={`${patient.patient_id}-${patient.condition}`}
          onClick={() => onPatientClick(patient.patient_id)}
        >
          <span>
            <strong>{patient.last_name}, {patient.first_name}</strong>
            <small>{patient.condition || "Active condition"}</small>
          </span>
          <span className="ht-follow-up-status">{patient.status}</span>
        </button>
      ))}
    </div>
  );
}

function PrintableReportSection({ label, data, limit = 50 }) {
  return (
    <div className="ht-print-period-content" aria-label={`${label} report`}>
      <ReportInsights data={data} heading={`${label} summary`} />
      <ReportTrendChart rows={data?.trend} hourly={data?.filters?.period === "hour"} />
      <div className="ht-print-report-grid">
        <ReportList title="Appointment Reasons / Program Demand" icon={ClipboardList} rows={normalizeRows(data?.reasons).slice(0, limit)} />
        <ReportList title="Common Conditions" icon={HeartPulse} rows={normalizeRows(data?.conditions).slice(0, limit)} />
        <ReportList title="Appointment Status" icon={Syringe} rows={normalizeRows(data?.statuses).slice(0, limit)} />
      </div>
    </div>
  );
}

function AppointmentDetailTable({ appointments }) {
  if (!appointments.length) return <EmptyState>No appointments recorded for this period.</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>Date</Th><Th>Patient</Th><Th>Reason / Program</Th><Th>Status</Th><Th>Notes</Th></tr></thead>
      <tbody>{appointments.map((appointment) => (
        <tr key={appointment.appointment_id}>
          <Td>{new Date(appointment.scheduled_at).toLocaleString()}</Td>
          <Td>{appointment.last_name}, {appointment.first_name}</Td>
          <Td>{appointment.reason || "Not specified"}</Td>
          <Td>{appointment.status}</Td>
          <Td>{appointment.notes || "—"}</Td>
        </tr>
      ))}</tbody>
    </Table>
  );
}

function exportRowSummary(total, limit) {
  const shown = Math.min(total, limit);
  return `Showing ${shown} of ${total}${total > shown ? ` — ${total - shown} more not included` : ""}`;
}

function notableAppointments(appointments) {
  return appointments.filter(appointment => appointment.status === "completed" || appointment.notes);
}

function NotableEvents({ appointments, onAppointmentClick, limit = 100 }) {
  const events = notableAppointments(appointments)
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    .slice(0, limit);

  if (!events.length) return <EmptyState>No notable events recorded.</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>Date</Th><Th>Patient</Th><Th>Event</Th><Th>Status</Th></tr></thead>
      <tbody>{events.map((event) => (
        <tr key={event.appointment_id}>
          <Td>{new Date(event.scheduled_at).toLocaleDateString()}</Td>
          <Td><button className="ht-link-button" onClick={() => onAppointmentClick?.(event)}>{event.last_name}, {event.first_name}</button></Td>
          <Td>{event.notes || `${event.reason} appointment completed`}</Td>
          <Td>{event.status}</Td>
        </tr>
      ))}</tbody>
    </Table>
  );
}

/** Admin dashboard and complete reporting workspace. */
export function Dashboard({ dashboard, appointments, loadData }) {
  const [, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showExport, setShowExport] = useState(false);
  const [reportSets, setReportSets] = useState({});
  const [reportError, setReportError] = useState(null);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  async function updateStatus(appointmentId, status) {
    await api.patch(`/appointments/${appointmentId}/status`, { status });
    await loadData();
  }

  useEffect(() => {
    let cancelled = false;
    setReportSets({});
    const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const today = new Date();
    Promise.all(PERIODS.map(async period => {
      const from = new Date(today);
      if (period.key === "daily") from.setHours(0,0,0,0);
      if (period.key === "weekly") from.setDate(from.getDate() - (from.getDay()+6)%7);
      if (period.key === "monthly") from.setDate(1);
      if (period.key === "quarterly") { from.setMonth(Math.floor(from.getMonth()/3)*3, 1); }
      if (period.key === "yearly") from.setMonth(0,1);
      const params = new URLSearchParams({ period: period.key === "daily" ? "hour" : period.key === "weekly" || period.key === "monthly" ? "day" : "month", from: dateKey(from), to: dateKey(today) });
      return [period.key, (await api.get(`/admin/reports?${params}`)).data];
    })).then(entries => { if (!cancelled) { setReportSets(Object.fromEntries(entries)); setReportError(null); } })
      .catch(error => { if (!cancelled) setReportError(error?.response?.data?.error || "Could not load report data."); });
    return () => { cancelled = true; };
  }, [appointments]);
  const report = reportSets[activeTab === "overview" ? "monthly" : activeTab];

  function selectPeriod(period) {
    setActiveTab(period.key);
  }

  const currentPeriod = PERIODS.find((period) => period.key === activeTab);
  function openPatient(patientId) {
    setSearchParams({ page: "patients", patientId });
  }

  function appointmentsFor(data) {
    if (!data?.filters) return [];
    return appointments.filter(a => { const d = new Date(a.scheduled_at); const start = new Date(data.filters.from + "T00:00:00"); const end = new Date(data.filters.to + "T23:59:59.999"); return d >= start && d <= end; }).sort((a,b) => new Date(b.scheduled_at)-new Date(a.scheduled_at));
  }
  const periodAppointments = appointmentsFor(report);
  const exportSections = [
    { key: "overview", label: "Overview", render: () => <>
      <div className="ht-export-summary"><div><strong>{dashboard.patientCount}</strong><span>Registered patients (current)</span></div><div><strong>{dashboard.appointmentsToday}</strong><span>Today's appointments</span></div><div><strong>{dashboard.upcomingCount}</strong><span>Upcoming appointments (all dates)</span></div></div>
      <ReportInsights data={reportSets.monthly} heading="Month-to-date operating summary" />
    </> },
    ...PERIODS.map(p => ({ key: p.key, label: `${p.label} report`, render: limit => <><p>{reportSets[p.key]?.filters?.from} to {reportSets[p.key]?.filters?.to}</p><PrintableReportSection label={p.label} data={reportSets[p.key]} limit={limit} /></> })),
    { key: "details", label: "Appointment details", periods: PERIODS, defaultPeriod: activeTab === "overview" ? "monthly" : activeTab, render: (limit, period) => {
      const data = reportSets[period];
      const rows = appointmentsFor(data);
      return <><p>{data?.filters?.from} to {data?.filters?.to} · {exportRowSummary(rows.length, limit)}</p><AppointmentDetailTable appointments={rows.slice(0, limit)} /></>;
    } },
    { key: "followups", label: "Patients needing follow-up", periods: PERIODS, defaultPeriod: activeTab === "overview" ? "monthly" : activeTab, render: (limit, period) => {
      const data = reportSets[period];
      return <><p>{data?.filters?.from} to {data?.filters?.to} · {exportRowSummary(data?.followUps?.length || 0, limit)}</p><FollowUpPatients patients={data?.followUps?.slice(0, limit)} onPatientClick={() => {}} /></>;
    } },
    { key: "events", label: "Notable events", periods: PERIODS, defaultPeriod: activeTab === "overview" ? "monthly" : activeTab, render: (limit, period) => {
      const data = reportSets[period];
      return <><p>{data?.filters?.from} to {data?.filters?.to} · {exportRowSummary(notableAppointments(appointmentsFor(data)).length, limit)}</p><NotableEvents appointments={appointmentsFor(data)} limit={limit} /></>;
    } }
  ];
  return (
    <div className="grid gap-4">
      <div className="ht-dashboard-screen">
        <PageHeader title="Admin Overview" subtitle="Barangay Health Center of Mambog I">
          <span className="ht-pill ht-pill-count"><CalendarDays size={18} strokeWidth={2} />{today}</span>
        </PageHeader>



        <div className="ht-metric-grid">
          <StatCard label="Today's Appointments" value={dashboard.appointmentsToday} tone="brand" icon={CalendarDays} />
          <StatCard label="Registered Patients" value={dashboard.patientCount} tone="brand" icon={Users} />
          <StatCard label="Upcoming Appointments" value={dashboard.upcomingCount} tone="brand" icon={ClockIcon} />
        </div>
        <div className="ht-report-tabs" role="tablist" aria-label="Health center reports">
          <button className={activeTab === "overview" ? "is-active" : ""} onClick={() => setActiveTab("overview")} role="tab" aria-selected={activeTab === "overview"}><BarChart3 size={16} /> Overview</button>
          {PERIODS.map((period) => <button key={period.key} className={activeTab === period.key ? "is-active" : ""} onClick={() => selectPeriod(period)} role="tab" aria-selected={activeTab === period.key}>{period.label}</button>)}
          <button className="ht-report-export ht-export-pdf-button" onClick={() => setShowExport(true)} disabled={!report || !!reportError}><Download size={16} /> Export PDF</button>
        </div>

        {!report && !reportError && <p role="status">Loading report data…</p>}
        {report && <p className="ht-report-range ht-muted">{report.filters.from} to {report.filters.to} · {activeTab === "overview" ? "Month" : currentPeriod.label} to date · {periodAppointments.length} appointments</p>}
        {activeTab === "overview" ? (
          <div className="grid gap-4">
            {reportError && <div className="ht-login-alert ht-login-alert-error">{reportError}</div>}
            <div className="ht-activity-layout">
              <ReportTrendChart rows={report?.trend} hourly={report?.filters?.period === "hour"} />
              <div className="ht-chart-card">
                <h3>Patients needing follow-up</h3>
                <div className="ht-follow-up-scroll"><FollowUpPatients patients={report?.followUps} onPatientClick={openPatient} /></div>
              </div>
            </div>
            <div className="ht-dashboard-events-grid">
              <div className="ht-panel ht-dashboard-schedule">
                <h2>Overview</h2>
                {dashboard.todaysAppointments.length === 0 ? <EmptyState>Nothing scheduled for today.</EmptyState> : (
                  <Table><thead><tr><Th>Time</Th><Th>Patient</Th><Th>Reason</Th><Th>Status</Th></tr></thead><tbody>
                    {dashboard.todaysAppointments.map((a) => <tr key={a.appointment_id}>
                      <Td className="whitespace-nowrap font-bold"><AppointmentDate appointment={a} timeOnly /></Td>
                      <Td><button onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id, appointmentId: a.appointment_id })} className="ht-link-button">{a.last_name}, {a.first_name}</button></Td>
                      <Td>{a.reason}</Td>
                      <Td>{a.status === "completed" ? <Badge>Completed</Badge> : <Select aria-label={`Update status for ${a.last_name}, ${a.first_name}`} value={a.status} onChange={(event) => updateStatus(a.appointment_id, event.target.value)} className={`ht-status-select ht-status-select-${a.status}`}>{STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</Select>}</Td>
                    </tr>)}
                  </tbody></Table>
                )}
              </div>
              <div className="ht-panel ht-dashboard-events"><h2>Notable Events</h2><NotableEvents appointments={periodAppointments} onAppointmentClick={a => setSearchParams({ page: "patients", patientId: a.patient_id, appointmentId: a.appointment_id })} /></div>
            </div>
            {report && <ReportInsights data={report} heading="Month-to-date operating summary" />}
            <div className="grid gap-4 lg:grid-cols-3">
              <ReportBarChart title="Top appointment reasons" rows={normalizeRows(report?.reasons)} />
              <ReportBarChart title="Common conditions" rows={normalizeRows(report?.conditions)} color="var(--color-danger)" />
              <ReportBarChart title="Appointment status" rows={normalizeRows(report?.statuses)} color="var(--color-warm)" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {reportError && <div className="ht-login-alert ht-login-alert-error">{reportError}</div>}
            {report && <ReportMetrics data={report} />}
            <div className="ht-panel ht-report-period-panel">
              <h2>{currentPeriod.label} Report</h2>
              <ReportTrendChart rows={report?.trend} compact hourly={report?.filters?.period === "hour"} />
            </div>
            {report && <ReportInsights data={report} heading={`${currentPeriod.label} operating summary`} includeMetrics={false} />}
            <div className="grid gap-4 lg:grid-cols-3">
              <ReportBarChart title="Appointment reasons" rows={normalizeRows(report?.reasons)} />
              <ReportBarChart title="Common conditions" rows={normalizeRows(report?.conditions)} color="var(--color-danger)" />
              <ReportBarChart title="Appointment status" rows={normalizeRows(report?.statuses)} color="var(--color-warm)" />
            </div>
          </div>
        )}
      </div>

      {showExport && <ExportDialog title="HealthTrack dashboard report" sections={exportSections} initialSelected={["overview", activeTab === "overview" ? "monthly" : activeTab]} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function ClockIcon(props) {
  return <FileText {...props} />;
}
