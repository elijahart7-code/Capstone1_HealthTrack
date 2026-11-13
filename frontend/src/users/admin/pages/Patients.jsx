import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarDays, Eye, Search, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import { api } from "../../../lib/axios";
import { calculateAge } from "../../../utils/calculateAge";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Input, Select } from "../../../components/ui/Input";
import { EmptyState, Table, Th, Td } from "../../../components/ui/Table";
import { PatientRecord } from "../../../shared/patients/PatientRecord";
import { PortalAccountBadge } from "../../../shared/patients/PortalAccountBadge";

export function Patients({ patients, loadData, showArchived, onArchivedChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("patientId");
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);
  const [archiveError, setArchiveError] = useState("");
  const [patientToArchive, setPatientToArchive] = useState(null);
  const [patientToRestore, setPatientToRestore] = useState(null);
  const [isClosingArchiveDialog, setIsClosingArchiveDialog] = useState(false);
  const [isClosingRestoreDialog, setIsClosingRestoreDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const archiveDialogCloseTimer = useRef(null);
  const restoreDialogCloseTimer = useRef(null);
  const pageSize = 10;

  useEffect(() => () => {
    window.clearTimeout(archiveDialogCloseTimer.current);
    window.clearTimeout(restoreDialogCloseTimer.current);
  }, []);

  function openArchiveDialog(patient) {
    window.clearTimeout(archiveDialogCloseTimer.current);
    setArchiveError("");
    setIsClosingArchiveDialog(false);
    setPatientToArchive(patient);
  }

  function closeArchiveDialog(force = false) {
    if ((isArchiving && !force) || isClosingArchiveDialog) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingArchiveDialog(true);
    archiveDialogCloseTimer.current = window.setTimeout(() => {
      setPatientToArchive(null);
      setIsClosingArchiveDialog(false);
    }, reduceMotion ? 0 : 220);
  }

  function openRestoreDialog(patient) {
    window.clearTimeout(restoreDialogCloseTimer.current);
    setArchiveError("");
    setIsClosingRestoreDialog(false);
    setPatientToRestore(patient);
  }

  function closeRestoreDialog(force = false) {
    if ((isRestoring && !force) || isClosingRestoreDialog) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingRestoreDialog(true);
    restoreDialogCloseTimer.current = window.setTimeout(() => {
      setPatientToRestore(null);
      setIsClosingRestoreDialog(false);
    }, reduceMotion ? 0 : 220);
  }

  async function archivePatient() {
    if (!patientToArchive || isArchiving || isClosingArchiveDialog) return;
    setArchiveError("");
    setIsArchiving(true);
    try {
      await api.post(`/patients/${patientToArchive.patient_id}/archive`);
      closeArchiveDialog(true);
      await loadData();
    } catch (err) {
      setArchiveError(err?.response?.data?.error || "Could not archive this patient.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function restorePatient() {
    if (!patientToRestore || isRestoring || isClosingRestoreDialog) return;
    setArchiveError("");
    setIsRestoring(true);
    try {
      await api.post(`/patients/${patientToRestore.patient_id}/restore`);
      closeRestoreDialog(true);
      await loadData(true);
    } catch (err) {
      setArchiveError(err?.response?.data?.error || "Could not restore this patient.");
    } finally {
      setIsRestoring(false);
    }
  }

  function openPatient(patient) {
    if (showArchived) {
      window.alert("You must unarchive this patient before opening or modifying their record.");
      return;
    }

    setSearchParams({ page: "patients", patientId: patient.patient_id });
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
      const nameOrder = (a.full_name || "").localeCompare(b.full_name || "", undefined, { sensitivity: "base" });
      return sortBy === "name_desc" ? -nameOrder : nameOrder;
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
        key={selectedId}
        patientId={selectedId}
        role="admin"
        onBack={() => setSearchParams({ page: "patients" })}
        onPatientUpdated={loadData}
      />
    );
  }

  return (
    <div className="grid gap-4 ht-admin-patient-lists-page">
      <PageHeader title="Patient Lists" subtitle="People registered at the Barangay Health Center of Mambog I.">
        <span className="ht-current-date-pill"><CalendarDays size={18} strokeWidth={2} />{today}</span>
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
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="newest">Recently Registered</option>
              <option value="birthdate">Date of Birth</option>
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
          <EmptyState>{search ? `No patient matches "${search}".` : "No patient found."}</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Full Name</Th>
                  <Th>Sex</Th>
                  <Th>Contact Number</Th>
                  <Th>Age</Th>
                  <Th>Portal Account</Th>
                  <Th>Patient Records</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.patient_id}>
                    <Td className="font-bold" style={{ color: "#1f2421" }}>
                      {p.full_name}
                    </Td>
                    <Td className="capitalize">{p.sex}</Td>
                    <Td>{p.contact_number || "--"}</Td>
                    <Td>{calculateAge(p.birthdate)}</Td>
                    <Td>
                      <PortalAccountBadge patient={p} />
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => openPatient(p)}
                        className="ht-record-action"
                      >
                        <span className="ht-record-action-icon">
                          <Eye size={15} strokeWidth={2} />
                        </span>
                        Open Record
                      </button>
                    </Td>
                    <Td className="ht-patient-actions-cell">
                      <div className="ht-patient-row-actions">
                        {showArchived ? (
                          <button
                            type="button"
                            onClick={() => openRestoreDialog(p)}
                            className="ht-restore-row-action"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openArchiveDialog(p)}
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
      {patientToArchive && (
        <div
          className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingArchiveDialog ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeArchiveDialog();
            }
          }}
        >
          <section
            aria-labelledby="archive-confirm-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingArchiveDialog ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="archive-confirm-title">Archive Patient?</h2>
            <p className="ht-confirm-message">
              Are you sure you want to archive {patientToArchive.full_name}? Their
              medical records will be preserved, but they will be hidden from
              active patient lists. Thank you!
            </p>
            {archiveError && (
              <p className="ht-confirm-error" role="alert">
                {archiveError}
              </p>
            )}
            <div className="ht-confirm-actions ht-archive-confirm-actions">
              <button
                className="ht-confirm-submit"
                disabled={isArchiving}
                onClick={archivePatient}
                type="button"
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </button>
              <button
                className="ht-confirm-cancel ht-archive-patient-cancel"
                disabled={isArchiving}
                onClick={() => closeArchiveDialog()}
                type="button"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {patientToRestore && (
        <div
          className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingRestoreDialog ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRestoreDialog();
            }
          }}
        >
          <section
            aria-labelledby="restore-confirm-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingRestoreDialog ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="restore-confirm-title">Restore Patient?</h2>
            <p>
              Restore {patientToRestore.full_name} to the active list?
            </p>
            {archiveError && (
              <p className="ht-confirm-error" role="alert">
                {archiveError}
              </p>
            )}
            <div className="ht-confirm-actions ht-archive-confirm-actions">
              <button
                className="ht-confirm-cancel"
                disabled={isRestoring}
                onClick={() => closeRestoreDialog()}
                type="button"
              >
                Cancel
              </button>
              <button
                className="ht-confirm-submit"
                disabled={isRestoring}
                onClick={restorePatient}
                type="button"
              >
                {isRestoring ? "Restoring..." : "OK"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
