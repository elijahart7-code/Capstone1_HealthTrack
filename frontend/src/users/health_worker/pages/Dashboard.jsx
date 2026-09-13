import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Users, CalendarDays, ShieldCheck, UserRoundX, Clock3 } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatCard } from "../../../components/ui/Card";
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";
import { calculateAge } from "../../../utils/calculateAge";

/** Dashboard screen for health workers. */
export function Dashboard({ dashboard, onRegisterClick }) {
  const [, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(dashboard.recentPatients.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagePatients = dashboard.recentPatients.slice(pageStart, pageStart + pageSize);
  const visiblePageCount = Math.min(5, totalPages);
  const firstVisiblePage = Math.min(Math.max(1, page - 2), totalPages - visiblePageCount + 1);
  const pageNumbers = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Health Worker Dashboard" subtitle="Register patients and view patient information.">
        <button onClick={onRegisterClick} className="ht-button">
          Register Patient
        </button>
      </PageHeader>

      <div className="ht-metric-grid">
        <StatCard label="Registered Patients" value={dashboard.patientCount} tone="brand" icon={Users} />
        <StatCard label="Registered This Month" value={dashboard.registeredThisMonth} tone="brand" icon={CalendarDays} />
        <StatCard label="With Portal Account" value={dashboard.withPortalAccount ?? dashboard.patientCount - dashboard.withoutPortalLogin} tone="brand" icon={ShieldCheck} />
        <StatCard label="Without Portal Account" value={dashboard.withoutPortalLogin} tone="brand" icon={UserRoundX} />
      </div>

      <div className="ht-panel ht-panel-table">
        <div className="ht-table-header-row">
          <h2 className="ht-section-title-with-icon">
            <span className="ht-section-icon" aria-hidden="true">
              <Clock3 size={16} strokeWidth={1.8} />
            </span>
            Recently Registered Patients
          </h2>
          <button className="ht-link-button" onClick={() => setSearchParams({ page: "patients" })}>
            View all patients <span aria-hidden="true">›</span>
          </button>
        </div>

        {dashboard.recentPatients.length === 0 ? (
          <EmptyState>No patients registered yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Age</Th>
                <Th>Contact Number</Th>
                <Th>Date Registered</Th>
                <Th className="ht-table-action">Action</Th>
              </tr>
            </thead>
            <tbody>
              {pagePatients.map((p) => (
                <tr key={p.patient_id}>
                  <Td className="font-bold" style={{ color: "var(--color-brand-strong)" }}>
                    {p.last_name}, {p.first_name}
                  </Td>
                  <Td>{calculateAge(p.birthdate)}</Td>
                  <Td>{p.contact_number || "--"}</Td>
                  <Td className="whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Td>
                  <Td className="ht-table-action">
                    <button
                      onClick={() => setSearchParams({ page: "patients", patientId: p.patient_id })}
                      className="ht-action-button"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="ht-action-eye">
                        <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                      View Record Only
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {dashboard.recentPatients.length > 0 && totalPages > 1 && (
          <div className="ht-pagination">
            <button
              className="ht-page-btn ht-page-btn-secondary"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ‹
            </button>

            {pageNumbers.map((value) => (
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
              aria-label="Next page"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}