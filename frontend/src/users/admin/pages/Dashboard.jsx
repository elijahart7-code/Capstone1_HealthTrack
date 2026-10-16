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
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const PERIODS = [
  { key: "daily", apiKey: "day", label: "Daily", days: 31 },
  { key: "weekly", apiKey: "week", label: "Weekly", days: 84 },
  { key: "monthly", apiKey: "month", label: "Monthly", days: 365 },
  { key: "quarterly", apiKey: "quarter", label: "Quarterly", days: 730 },
  { key: "yearly", apiKey: "year", label: "Yearly", days: 1825 },
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

function formatTrendLabel(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ReportTrendChart({ rows = [] }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...rows.map((row) => row.total), 1);
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
    <div className="ht-chart-card">
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
              <circle cx={row.x} cy={row.y} r="5" fill="var(--color-brand-strong)" />
              <circle cx={row.x} cy={row.y} r="14" fill="transparent" />
              {(index === 0 || index === points.length - 1 || points.length <= 8) && (
                <text x={row.x} y={height - 24} textAnchor="middle" className="ht-chart-axis-label">
                  {formatTrendLabel(row.period)}
                </text>
              )}
            </g>
          ))}
          {hovered && (
            <g pointerEvents="none">
              <rect x={Math.min(Math.max(hovered.x - 78, left), width - right - 156)} y={Math.max(hovered.y - 58, 4)} width="156" height="44" rx="6" className="ht-chart-tooltip" />
              <text x={Math.min(Math.max(hovered.x, left + 78), width - right - 78)} y={Math.max(hovered.y - 36, 20)} textAnchor="middle" className="ht-chart-tooltip-text">
                {formatTrendLabel(hovered.period)}: {hovered.total} appointments
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

function PrintableReportSection({ label, data }) {
  return (
    <section>
      <h2>{label} report</h2>
      <ReportTrendChart rows={data?.trend} />
      <div className="ht-print-report-grid">
        <ReportList title="Appointment Reasons / Program Demand" icon={ClipboardList} rows={normalizeRows(data?.reasons)} />
        <ReportList title="Common Conditions" icon={HeartPulse} rows={normalizeRows(data?.conditions)} />
        <ReportList title="Appointment Status" icon={Syringe} rows={normalizeRows(data?.statuses)} />
      </div>
    </section>
  );
}

function PatientReportTable({ patients = [] }) {
  if (!patients.length) return <EmptyState>No patients had appointments in this period.</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>Patient</Th><Th>Appointments</Th><Th>Reasons / Programs</Th><Th>Latest appointment</Th></tr></thead>
      <tbody>{patients.map((patient) => (
        <tr key={patient.patient_id}>
          <Td>{patient.last_name}, {patient.first_name}</Td>
          <Td>{patient.appointment_count}</Td>
          <Td>{patient.reasons || "Not specified"}</Td>
          <Td>{new Date(patient.latest_appointment).toLocaleDateString()}</Td>
        </tr>
      ))}</tbody>
    </Table>
  );
}

function AppointmentDetailTable({ appointments }) {
  if (!appointments.length) return <EmptyState>No appointments recorded this month.</EmptyState>;
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

function FullReport({ dashboard, appointments, report, reportSets }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthlyAppointments = appointments.filter((appointment) => new Date(appointment.scheduled_at) >= monthStart);
  return (
    <div className="ht-print-report">
      <div className="ht-print-cover">
        <p className="ht-report-kicker">HealthTrack Administration</p>
        <h1>Complete Health Center Report</h1>
        <p>Barangay Health Center of Mambog I</p>
        <p className="ht-muted">Generated {new Date().toLocaleString()}</p>
      </div>
      <section>
        <h2>Overview</h2>
        <div className="ht-print-summary">
          <div><strong>{dashboard.patientCount}</strong><span>Registered patients</span></div>
          <div><strong>{appointments.length}</strong><span>Total appointments</span></div>
          <div><strong>{dashboard.appointmentsToday}</strong><span>Appointments today</span></div>
          <div><strong>{dashboard.upcomingCount}</strong><span>Upcoming appointments</span></div>
        </div>
      </section>
      {["weekly", "monthly", "quarterly"].map((key) => (
        <PrintableReportSection key={key} label={PERIODS.find((period) => period.key === key).label} data={reportSets[key] || report} />
      ))}
      <section>
        <h2>Patients with appointments this month</h2>
        <PatientReportTable patients={reportSets.monthly?.patients || report?.patients} />
      </section>
      <section>
        <h2>Appointment details this month</h2>
        <AppointmentDetailTable appointments={monthlyAppointments} />
      </section>
      <section>
        <h2>Patients needing follow-up</h2>
        <FollowUpPatients patients={report?.followUps} onPatientClick={() => {}} />
      </section>
      <section>
        <h2>Notable Events</h2>
        <NotableEvents appointments={appointments} />
      </section>
    </div>
  );
}

function NotableEvents({ appointments }) {
  const events = [...appointments]
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    .filter((appointment) => appointment.status === "completed" || appointment.notes)
    .slice(0, 20);

  if (!events.length) return <EmptyState>No notable events recorded.</EmptyState>;
  return (
    <Table>
      <thead><tr><Th>Date</Th><Th>Event</Th><Th>Status</Th></tr></thead>
      <tbody>{events.map((event) => (
        <tr key={event.appointment_id}>
          <Td>{new Date(event.scheduled_at).toLocaleDateString()}</Td>
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
  const [report, setReport] = useState(null);
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
    const today = new Date();
    const requests = PERIODS.reduce((result, period) => {
      const from = new Date(today);
      from.setDate(from.getDate() - period.days);
      const params = new URLSearchParams({
        period: period.apiKey,
        from: from.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
      });
      result[period.key] = api.get(`/admin/reports?${params}`).then(({ data }) => data);
      return result;
    }, {});
    Promise.all(Object.entries(requests).map(async ([key, request]) => [key, await request]))
      .then((entries) => {
        const nextReports = Object.fromEntries(entries);
        setReportSets(nextReports);
        setReport(activeTab === "overview" ? nextReports.daily : nextReports[activeTab]);
        setReportError(null);
      })
      .catch((error) => setReportError(error?.response?.data?.error || "Could not load report data."));
  }, [activeTab]);

  function selectPeriod(period) {
    setActiveTab(period.key);
  }

  function exportReport() {
    const title = document.title;
    document.title = "HealthTrack Complete Report";
    window.print();
    window.setTimeout(() => { document.title = title; }, 1000);
  }

  const currentPeriod = PERIODS.find((period) => period.key === activeTab);
  function openPatient(patientId) {
    setSearchParams({ page: "patients", patientId });
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Admin Overview" subtitle="Barangay Health Center of Mambog I">
        <span className="ht-pill ht-pill-count"><CalendarDays size={18} strokeWidth={2} />{today}</span>
      </PageHeader>

      <div className="ht-report-tabs" role="tablist" aria-label="Health center reports">
        <button className={activeTab === "overview" ? "is-active" : ""} onClick={() => setActiveTab("overview")} role="tab" aria-selected={activeTab === "overview"}><BarChart3 size={16} /> Overview</button>
        {PERIODS.map((period) => <button key={period.key} className={activeTab === period.key ? "is-active" : ""} onClick={() => selectPeriod(period)} role="tab" aria-selected={activeTab === period.key}>{period.label}</button>)}
        <button className="ht-report-export" onClick={exportReport}><Download size={16} /> Export PDF</button>
      </div>

      <div className="ht-metric-grid">
        <StatCard label="Today's Appointments" value={dashboard.appointmentsToday} tone="brand" icon={CalendarDays} />
        <StatCard label="Registered Patients" value={dashboard.patientCount} tone="brand" icon={Users} />
        <StatCard label="Upcoming Appointments" value={dashboard.upcomingCount} tone="brand" icon={ClockIcon} />
        <StatCard label="Total Appointments" value={appointments.length} tone="warm" icon={Syringe} />
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4">
          {reportError && <div className="ht-login-alert ht-login-alert-error">{reportError}</div>}
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportTrendChart rows={report?.trend} />
            <div className="ht-chart-card">
              <h3>Patients needing follow-up</h3>
              <FollowUpPatients patients={report?.followUps} onPatientClick={openPatient} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ReportBarChart title="Top appointment reasons" rows={normalizeRows(report?.reasons)} />
            <ReportBarChart title="Common conditions" rows={normalizeRows(report?.conditions)} color="var(--color-danger)" />
            <ReportBarChart title="Appointment status" rows={normalizeRows(report?.statuses)} color="var(--color-warm)" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="ht-panel ht-dashboard-schedule">
            <h2>Overview</h2>
            {dashboard.todaysAppointments.length === 0 ? <EmptyState>Nothing scheduled for today.</EmptyState> : (
              <Table><thead><tr><Th>Time</Th><Th>Patient</Th><Th>Reason</Th><Th>Status</Th></tr></thead><tbody>
                {dashboard.todaysAppointments.map((a) => <tr key={a.appointment_id}>
                  <Td className="whitespace-nowrap font-bold">{new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Td>
                  <Td><button onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id })} className="ht-link-button">{a.last_name}, {a.first_name}</button></Td>
                  <Td>{a.reason}</Td>
                  <Td><Select aria-label={`Update status for ${a.last_name}, ${a.first_name}`} value={a.status} onChange={(event) => updateStatus(a.appointment_id, event.target.value)} className={`ht-status-select ht-status-select-${a.status}`}>{STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</Select></Td>
                </tr>)}
              </tbody></Table>
            )}
          </div>
          <div className="ht-panel"><h2>Notable Events</h2><NotableEvents appointments={appointments} /></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {reportError && <div className="ht-login-alert ht-login-alert-error">{reportError}</div>}
          <div className="ht-panel">
            <h2>{currentPeriod.label} Report</h2>
            <p className="ht-muted mb-4">Aggregated report data grouped by {currentPeriod.label.toLowerCase()}.</p>
            <ReportTrendChart rows={report?.trend} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ReportBarChart title="Appointment reasons" rows={normalizeRows(report?.reasons)} />
            <ReportBarChart title="Common conditions" rows={normalizeRows(report?.conditions)} color="var(--color-danger)" />
            <div className="ht-chart-card">
              <h3>Patients needing follow-up</h3>
              <FollowUpPatients patients={report?.followUps} onPatientClick={openPatient} />
            </div>
          </div>
        </div>
      )}

      <FullReport dashboard={dashboard} appointments={appointments} report={report} reportSets={reportSets} />
    </div>
  );
}

function ClockIcon(props) {
  return <FileText {...props} />;
}
