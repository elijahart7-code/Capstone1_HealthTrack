import { useSearchParams } from "react-router";
import { CalendarDays, Clock3, Eye, Users } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatCard } from "../../../components/ui/Card";
import { EmptyState, Table, Th, Td, Badge } from "../../../components/ui/Table";

/** Admin dashboard. */
export function Dashboard({ dashboard }) {
  const [, setSearchParams] = useSearchParams();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grid gap-4">
      <PageHeader title="Admin Dashboard" subtitle="Barangay Health Center of Mambog I">
        <span className="ht-pill ht-pill-count">
          <CalendarDays size={18} strokeWidth={2} />
          {today}
        </span>
      </PageHeader>

      <div className="ht-metric-grid">
        <StatCard label="Registered Patients" value={dashboard.patientCount} tone="brand" icon={Users} />
        <StatCard label="Appointments Today" value={dashboard.appointmentsToday} tone="brand" icon={CalendarDays} />
        <StatCard label="Upcoming Appointments" value={dashboard.upcomingCount} tone="brand" icon={Clock3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="ht-panel">
          <h2>Today's Schedule</h2>

          {dashboard.todaysAppointments.length === 0 ? (
            <EmptyState>Nothing scheduled for today.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Patient</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {dashboard.todaysAppointments.map((a) => (
                  <tr key={a.appointment_id}>
                    <Td className="whitespace-nowrap font-bold">
                      {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Td>
                    <Td>
                      <button
                        onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id })}
                        className="ht-link-button"
                      >
                        {a.last_name}, {a.first_name}
                      </button>
                    </Td>
                    <Td>{a.reason}</Td>
                    <Td>
                      <Badge>{a.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="ht-panel ht-recent-panel">
          <h2>Recently Registered</h2>

          {dashboard.recentPatients.length === 0 ? (
            <EmptyState>No patients yet.</EmptyState>
          ) : (
            <ul className="ht-recent-list">
              {dashboard.recentPatients.map((p) => (
                <li key={p.patient_id}>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ page: "patients", patientId: p.patient_id })}
                    className="ht-recent-item"
                  >
                    <div>
                      <span className="ht-recent-name">{p.last_name}, {p.first_name}</span>
                      <span className="ht-recent-meta">Registered {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className="ht-view-button" aria-label={`View ${p.last_name}, ${p.first_name}`}>
                      <Eye size={14} strokeWidth={2} />
                      View
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button onClick={() => setSearchParams({ page: "patients" })} className="ht-button ht-button-muted ht-button-full mt-3">
            <Users size={17} strokeWidth={1.8} />
            View All Patients
          </button>
        </div>
      </div>
    </div>
  );
}
