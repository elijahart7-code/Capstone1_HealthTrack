import { useEffect, useMemo, useState } from "react";
import { Calendar, Eye } from "lucide-react";
import { useSearchParams } from "react-router";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Input";
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const STATUS_COLORS = {
  pending: "ht-status-badge-pending",
  confirmed: "ht-status-badge-active",
  completed: "ht-status-badge-completed",
  cancelled: "ht-status-badge-cancelled",
};

/** Admin appointment management. */
export function Appointments({ appointments, loadData }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [, setSearchParams] = useSearchParams();
  const pageSize = 10;

  const visible = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    let list = appointments;
    if (filter === "today") {
      list = list.filter((a) => new Date(a.scheduled_at) >= startOfToday && new Date(a.scheduled_at) < endOfToday);
    } else if (filter === "past") {
      list = [...list.filter((a) => new Date(a.scheduled_at) < now)].sort(
        (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)
      );
    } else if (filter === "upcoming") {
      list = list.filter((a) => new Date(a.scheduled_at) >= now && !["completed", "cancelled"].includes(a.status));
    }
    return [...list].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  }, [appointments, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageItems = visible.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function setStatus(appointmentId, status) {
    await api.patch(`/appointments/${appointmentId}/status`, { status });
    loadData();
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Appointments" subtitle="Schedule new appointments from a patient's record.">
        <span className="ht-pill ht-pill-count">
          <Calendar size={18} strokeWidth={2} />
          {appointments.length} Appointments
        </span>
      </PageHeader>

      <div className="ht-panel ht-appointments-panel">
        <div className="ht-appointments-toolbar">
          <div className="ht-toolbar-field ht-toolbar-field-filter">
            <label className="ht-toolbar-label">Show</label>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="ht-filter-select">
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="previous">Previous</option>
              <option value="all">All</option>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState>No appointments in this view.</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Date & Time</Th>
                  <Th>Patient</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => {
                  const appointmentDate = new Date(a.scheduled_at);
                  const dateStr = appointmentDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
                  const timeStr = appointmentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                  return (
                    <tr key={a.appointment_id}>
                      <Td className="font-bold" style={{ color: "#1f2421" }}>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <div>
                            <div>{dateStr}</div>
                            <div className="text-xs text-gray-500">{timeStr}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id })}
                          style={{ color: "var(--color-brand-strong)", fontWeight: 700 }}
                        >
                          {a.last_name}, {a.first_name}
                        </button>
                      </Td>
                      <Td>{a.reason}</Td>
                      <Td>
                        <span className={`ht-status-badge ${STATUS_COLORS[a.status] || "ht-status-badge-pending"}`}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id })}
                          className="ht-record-action"
                        >
                          <span className="ht-record-action-icon">
                            <Eye size={15} strokeWidth={2} />
                          </span>
                          Open / Modify Record
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {totalPages > 1 && (
              <div className="ht-pagination">
                <button
                  className="ht-page-btn ht-page-btn-secondary"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  ‹ Previous
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    className={`ht-page-btn ${page === value ? "ht-page-btn-active" : ""}`}
                    onClick={() => setPage(value)}
                  >
                    {value}
                  </button>
                ))}

                <button
                  className="ht-page-btn ht-page-btn-secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
