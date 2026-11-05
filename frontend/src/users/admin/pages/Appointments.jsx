import { AppointmentDate } from "../../../shared/appointments/AppointmentDate";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Eye, Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Input, Select } from "../../../components/ui/Input";
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";

const STATUSES = ["confirmed", "cancelled"];
const STATUS_COLORS = {
  confirmed: "ht-status-badge-active",
  completed: "ht-status-badge-completed",
  cancelled: "ht-status-badge-cancelled",
};

export function Appointments({ appointments, loadData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [, setSearchParams] = useSearchParams();
  const pageSize = 10;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments
      .filter((appointment) => statusFilter === "all" || appointment.status === statusFilter)
      .filter((appointment) => {
        const patientName = `${appointment.last_name || ""}, ${appointment.first_name || ""}`.toLowerCase();
        return !term || patientName.includes(term);
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  }, [appointments, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageItems = visible.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function setStatus(appointmentId, status) {
    await api.patch(`/appointments/${appointmentId}/status`, { status });
    loadData();
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Appointment Lists" subtitle="Schedule new appointments from a patient's record.">
        <span className="ht-pill ht-pill-count">
          <Calendar size={18} strokeWidth={2} />
          {appointments.length} Appointments
        </span>
      </PageHeader>

      <div className="ht-panel ht-appointments-panel">
        <div className="ht-appointments-toolbar">
          <div className="ht-toolbar-field">
            <label className="ht-toolbar-label" htmlFor="appointment-patient-search">Search</label>
            <div className="ht-search-wrap">
              <Search size={16} strokeWidth={2} />
              <Input
                id="appointment-patient-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Patient Name"
                className="ht-search-input"
              />
            </div>
          </div>
          <div className="ht-toolbar-field ht-toolbar-field-sort">
            <label className="ht-toolbar-label" htmlFor="appointment-status-filter">Sort by</label>
            <Select
              id="appointment-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="ht-sort-select"
            >
              <option value="all">All</option>
              <option value="cancelled">Cancelled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState>No Appointments until this time.Thank you!</EmptyState>
        ) : (
          <>
            <Table>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <Th>Date & Time</Th>
                  <Th>Patient</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th>Patient Records</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => {
                  return (
                    <tr key={a.appointment_id}>
                      <Td className="font-bold" style={{ color: "#1f2421" }}>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <AppointmentDate appointment={a} />
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id, appointmentId: a.appointment_id })}
                          style={{ color: "var(--color-brand-strong)", fontWeight: 700 }}
                        >
                          {a.last_name}, {a.first_name}
                        </button>
                      </Td>
                      <Td>{a.reason}</Td>
                      <Td>
                        {a.status === "completed" ? <span className="ht-status-badge ht-status-badge-completed">Completed</span> : <Select
                          aria-label={`Update status for ${a.last_name}, ${a.first_name}`}
                          value={a.status}
                          onChange={(event) => setStatus(a.appointment_id, event.target.value)}
                          className={`ht-status-select ht-status-select-${a.status}`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </Select>}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id, appointmentId: a.appointment_id })}
                          className="ht-record-action"
                        >
                          <span className="ht-record-action-icon">
                            <Eye size={15} strokeWidth={2} />
                          </span>
                          Open appointment
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
