import { useEffect, useMemo, useState } from "react";
import { Archive, Eye, Search, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import { api } from "../../../lib/axios";
import { calculateAge } from "../../../utils/calculateAge";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Input, Select } from "../../../components/ui/Input";
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";
import { PatientRecord } from "../../../shared/patients/PatientRecord";

/** Patient list screen for the admin role. */
export function Patients({ patients, loadData, showArchived, onArchivedChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("patientId");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_name");
  const [page, setPage] = useState(1);
  const [archiveError, setArchiveError] = useState("");
  const pageSize = 10;

  async function archivePatient(patient) {
    const confirmed = window.confirm(
      `Are you sure you want to archive ${patient.full_name}? Their clinical history will be preserved, but they will be hidden from active patient lists.`
    );
    if (!confirmed) return;

    setArchiveError("");
    try {
      await api.post(`/patients/${patient.patient_id}/archive`);
      await loadData();
    } catch (err) {
      setArchiveError(err?.response?.data?.error || "Could not archive this patient.");
    }

    async function restorePatient(patient) {
      if (!window.confirm(`Restore ${patient.full_name} to the active patient list?`)) return;
      setArchiveError("");
      try {
        await api.post(`/patients/${patient.patient_id}/restore`);
        await loadData(true);
      } catch (err) {
        setArchiveError(err?.response?.data?.error || "Could not restore this patient.");
      }
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = patients;

    if (term) {
      list = list.filter(
        (p) =>
          p.first_name.toLowerCase().includes(term) ||
          (p.middle_name || "").toLowerCase().includes(term) ||
          p.last_name.toLowerCase().includes(term) ||
          (p.contact_number || "").toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "birthdate") return new Date(a.birthdate) - new Date(b.birthdate);
      return a.last_name.localeCompare(b.last_name);
    });
  }, [patients, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageItems = visible.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, showArchived]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (selectedId) {
    return (
      <PatientRecord
        patientId={selectedId}
        role="admin"
        onBack={() => setSearchParams({ page: "patients" })}
        onPatientUpdated={loadData}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Patient Lists" subtitle="People registered at the Barangay Health Center of Mambog I.">
        <span className="ht-pill ht-pill-count">
          <Users size={18} strokeWidth={2} />
          {patients.length} Registered
        </span>
      </PageHeader>

      <div className="ht-panel ht-patient-panel">
        {archiveError && <div className="ht-login-alert ht-login-alert-error">{archiveError}</div>}
        <div className="ht-patient-toolbar">
          <div className="ht-toolbar-field">
            <label className="ht-toolbar-label">Search</label>
            <div className="ht-search-wrap">
              <Search size={16} strokeWidth={2} />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient name or contact number"
                className="ht-search-input"
              />
            </div>
          </div>

          <div className="ht-toolbar-field ht-toolbar-field-sort">
            <label className="ht-toolbar-label">Sort by</label>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="ht-sort-select">
              <option value="last_name">Surname (A-Z)</option>
              <option value="newest">Recently registered</option>
              <option value="birthdate">Date of birth</option>
            </Select>
          </div>
          <label className="ht-archive-filter">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => onArchivedChange(event.target.checked)}
            />
            Show archived patients
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState>{search ? `No patient matches "${search}".` : "No patients registered yet."}</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Age</Th>
                  <Th>Sex</Th>
                  <Th>Contact</Th>
                  <Th>Portal Account</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.patient_id}>
                    <Td className="font-bold" style={{ color: "#1f2421" }}>
                      {p.full_name}
                    </Td>
                    <Td>{calculateAge(p.birthdate)}</Td>
                    <Td className="capitalize">{p.sex}</Td>
                    <Td>{p.contact_number || "--"}</Td>
                    <Td>
                      {p.user_id ? <span className="ht-status-badge ht-status-badge-active">Active</span> : <span className="ht-status-badge ht-status-badge-inactive">Inactive</span>}
                    </Td>
                    <Td>
                      <div className="ht-patient-row-actions">
                        <button
                          type="button"
                          onClick={() => setSearchParams({ page: "patients", patientId: p.patient_id })}
                          className="ht-record-action"
                        >
                          <span className="ht-record-action-icon">
                            <Eye size={15} strokeWidth={2} />
                          </span>
                          Open / Modify Record
                        </button>
                        {showArchived ? (
                          <button
                            type="button"
                            onClick={() => restorePatient(p)}
                            className="ht-restore-row-action"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archivePatient(p)}
                            className="ht-archive-row-action"
                          >
                            <Archive size={15} strokeWidth={2} />
                            Archive
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
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
