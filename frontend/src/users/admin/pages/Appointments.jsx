import { AppointmentDate } from "../../../shared/appointments/AppointmentDate";
import { parseAppointmentDateTime, sortAppointmentsChronologically } from "../../../shared/appointments/dateTime";
import { AppointmentStatusControl } from "../../../shared/appointments/AppointmentStatusControl";
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

function getPatientName(appointment) {
  const firstAndMiddleName = [appointment.first_name, appointment.middle_name].filter(Boolean).join(" ");
  return [appointment.last_name, firstAndMiddleName].filter(Boolean).join(", ");
}

export function Appointments({ appointments, loadData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const requestedStatus = searchParams.get("status");
    return ["upcoming", "confirmed", "cancelled", "completed"].includes(requestedStatus) ? requestedStatus : "upcoming";
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filteredAppointments = appointments
      .filter((appointment) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "upcoming") {
          return appointment.status === "confirmed" && parseAppointmentDateTime(appointment.scheduled_at).getTime() > Date.now();
        }
        return appointment.status === statusFilter;
      })
      .filter((appointment) => {
        const patientName = getPatientName(appointment).toLowerCase();
        return !term || patientName.includes(term);
      });

    return sortAppointmentsChronologically(filteredAppointments);
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
    <div className="grid gap-4 ht-admin-appointment-lists-page">
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
              onChange={(event) => {
                const nextStatus = event.target.value;
                setStatusFilter(nextStatus);
                setSearchParams(nextStatus === "all"
                  ? { page: "appointments" }
                  : { page: "appointments", status: nextStatus });
              }}
              className="ht-sort-select"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
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
                        <div className="ht-appointment-date-time flex items-center gap-2">
                          <Calendar size={16} />
                          <AppointmentDate appointment={a} />
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => setSearchParams({ page: "patients", patientId: a.patient_id, appointmentId: a.appointment_id })}
                          style={{ color: "#000000", fontSize: 14, fontWeight: 400 }}
                        >
                          {getPatientName(a)}
                        </button>
                      </Td>
                      <Td>{a.reason}</Td>
                      <Td>
                        <AppointmentStatusControl
                          appointmentId={a.appointment_id}
                          label={`${a.last_name}, ${a.first_name}`}
                          status={a.status}
                          onChange={(status) => setStatus(a.appointment_id, status)}
                        />
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
                          Open Appointment
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
