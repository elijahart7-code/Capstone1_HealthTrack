import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Filter,
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
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function startOfPeriod(date, period) {
  const value = new Date(date);
  if (period === "daily") return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (period === "weekly") {
    const day = value.getDay();
    return new Date(value.getFullYear(), value.getMonth(), value.getDate() - day);
  }
  if (period === "monthly") return new Date(value.getFullYear(), value.getMonth(), 1);
  return new Date(value.getFullYear(), 0, 1);
}

function periodKey(date, period) {
  const value = startOfPeriod(date, period);
  if (period === "daily") return value.toISOString().slice(0, 10);
  if (period === "weekly") return value.toISOString().slice(0, 10);
  if (period === "monthly") return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  return String(value.getFullYear());
}

function formatPeriod(date, period) {
  const value = startOfPeriod(date, period);
  if (period === "daily") return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (period === "weekly") return `Week of ${value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  if (period === "monthly") return value.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return String(value.getFullYear());
}

function countBy(items, getLabel) {
  return Object.entries(items.reduce((counts, item) => {
    const label = getLabel(item) || "Not specified";
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]);
}

function getProgram(reason = "") {
  const value = reason.toLowerCase();
  if (value.includes("maternal") || value.includes("prenatal") || value.includes("pregnan")) return "Maternal checkups";
  if (value.includes("circum")) return "Circumcision";
  if (value.includes("vaccin") || value.includes("immun")) return "Vaccination";
  return "General checkups";
}

function ReportBreakdown({ appointments, period }) {
  const grouped = useMemo(() => {
    const byPeriod = {};
    appointments.forEach((appointment) => {
      const key = periodKey(appointment.scheduled_at, period);
      byPeriod[key] ||= [];
      byPeriod[key].push(appointment);
    });
    return Object.entries(byPeriod)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, items]) => ({
        label: formatPeriod(items[0].scheduled_at, period),
        items,
        reasons: countBy(items, (item) => item.reason),
        diseases: countBy(items, (item) => item.reason),
        programs: countBy(items, (item) => getProgram(item.reason)),
      }));
  }, [appointments, period]);

  if (!grouped.length) return <EmptyState>No report data for this period.</EmptyState>;

  return (
    <div className="grid gap-4">
      {grouped.map((group) => (
        <div className="ht-report-period" key={group.label}>
          <h3>{group.label}</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <ReportList title="Checkup Reasons" icon={ClipboardList} rows={group.reasons} />
            <ReportList title="Common Diseases" icon={HeartPulse} rows={group.diseases} />
            <ReportList title="Programs & Procedures" icon={Activity} rows={group.programs} />
          </div>
        </div>
      ))}
    </div>
  );
}

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

function ReportTrendChart({ rows = [] }) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  const width = 640;
  const height = 210;
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * (width - 32) + 16;
    const y = height - 28 - (row.total / max) * (height - 52);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="ht-chart-card">
      <h3>Appointment activity</h3>
      {!rows.length ? <EmptyState>No appointments for this range.</EmptyState> : (
        <svg className="ht-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Appointment activity trend">
          <line x1="16" y1={height - 28} x2={width - 16} y2={height - 28} stroke="currentColor" opacity=".2" />
          <polyline points={points} fill="none" stroke="var(--color-brand-strong)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {rows.map((row, index) => {
            const [x, y] = points.split(" ")[index].split(",");
            return <circle key={row.period} cx={x} cy={y} r="5" fill="var(--color-brand-strong)" />;
          })}
        </svg>
      )}
    </div>
  );
}

function normalizeRows(rows = []) {
  return rows.map((row) => [row.label, Number(row.count)]);
}

function FullReport({ dashboard, appointments, report }) {
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
      <section>
        <h2>Report summaries</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportList title="Appointment Reasons" icon={ClipboardList} rows={normalizeRows(report?.reasons)} />
          <ReportList title="Common Conditions" icon={HeartPulse} rows={normalizeRows(report?.conditions)} />
          <ReportList title="Allergy Reactions" icon={Activity} rows={normalizeRows(report?.allergyReactions)} />
          <ReportList title="Immunization Status" icon={Syringe} rows={normalizeRows(report?.immunizations)} />
        </div>
      </section>
      {PERIODS.map(({ key, label }) => (
        <section key={key}>
          <h2>{label} Report</h2>
          <ReportBreakdown appointments={appointments} period={key} />
        </section>
      ))}
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
  const [reportError, setReportError] = useState(null);
  const [reportPeriod, setReportPeriod] = useState("month");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportFrom, setReportFrom] = useState(() => new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().slice(0, 10));
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  async function updateStatus(appointmentId, status) {
    await api.patch(`/appointments/${appointmentId}/status`, { status });
    await loadData();
  }

  useEffect(() => {
    const params = new URLSearchParams({ period: reportPeriod, from: reportFrom, to: reportTo });
    if (reportStatus !== "all") params.set("status", reportStatus);
    api.get(`/admin/reports?${params}`)
      .then(({ data }) => {
        setReport(data);
        setReportError(null);
      })
      .catch((error) => setReportError(error?.response?.data?.error || "Could not load report data."));
  }, [reportPeriod, reportStatus, reportFrom, reportTo]);

  function exportReport() {
    const title = document.title;
    document.title = "HealthTrack Complete Report";
    window.print();
    window.setTimeout(() => { document.title = title; }, 1000);
  }

  const currentPeriod = PERIODS.find((period) => period.key === activeTab);

  return (
    <div className="grid gap-4">
      <PageHeader title="Admin Overview" subtitle="Barangay Health Center of Mambog I">
        <span className="ht-pill ht-pill-count"><CalendarDays size={18} strokeWidth={2} />{today}</span>
      </PageHeader>

      <div className="ht-report-tabs" role="tablist" aria-label="Health center reports">
        <button className={activeTab === "overview" ? "is-active" : ""} onClick={() => setActiveTab("overview")} role="tab" aria-selected={activeTab === "overview"}><BarChart3 size={16} /> Overview</button>
        {PERIODS.map(({ key, label }) => <button key={key} className={activeTab === key ? "is-active" : ""} onClick={() => setActiveTab(key)} role="tab" aria-selected={activeTab === key}>{label}</button>)}
        <button className="ht-report-export" onClick={exportReport}><Download size={16} /> Export PDF</button>
      </div>

      <div className="ht-report-filters ht-panel">
        <div className="ht-report-filter-title"><Filter size={16} /> Report filters</div>
        <label>From <input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} /></label>
        <label>To <input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} /></label>
        <label>Grouping <Select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></Select></label>
        <label>Status <Select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</Select></label>
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
            <ReportBarChart title="Appointment status" rows={normalizeRows(report?.statuses)} color="var(--color-warm)" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ReportBarChart title="Top appointment reasons" rows={normalizeRows(report?.reasons)} />
            <ReportBarChart title="Common conditions" rows={normalizeRows(report?.conditions)} color="var(--color-danger)" />
            <ReportBarChart title="Allergy reactions" rows={normalizeRows(report?.allergyReactions)} color="var(--color-warm)" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <ReportBarChart title="Immunization status" rows={normalizeRows(report?.immunizations)} color="var(--color-brand)" />
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
        <div className="ht-panel">
          <h2>{currentPeriod.label} Report</h2>
          <p className="ht-muted mb-4">Checkup reasons, common diseases, and programs & procedures grouped by {currentPeriod.label.toLowerCase()}.</p>
          <ReportBreakdown appointments={appointments} period={currentPeriod.key} />
        </div>
      )}

      <FullReport dashboard={dashboard} appointments={appointments} report={report} />
    </div>
  );
}

function ClockIcon(props) {
  return <FileText {...props} />;
}
