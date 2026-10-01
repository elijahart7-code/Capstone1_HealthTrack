import { useSearchParams } from "react-router";
import {
  Home,
  Calendar,
  User,
  Activity,
  Lock,
  FileText,
  ChevronDown,
  HeartPulse,
  Stethoscope,
  Droplets,
  ClipboardList,
  TriangleAlert,
} from "lucide-react";

const SECTION_ICONS = {
  appointments: Calendar,
  "patient-information": User,
  "vital-signs": Activity,
  "midwife-notes": FileText,
  "medical-history": FileText,
  allergies: Activity,
};

/**
 * Port of resources/views/livewire/patient/health-information.blade.php --
 * the 250px sidebar of section links + main content column of read-only
 * cards, one per clinical record type (plus Appointments and Patient
 * Information). The original only wired up 3 sections (appointments,
 * patient info, vital signs) with a static "Page 1 of 2" footer; this
 * covers every record type we actually have, so that footer is dropped.
 */
export function HealthInformation({ healthInfo }) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (!healthInfo.patient) {
    return (
      <div className="ht-panel">
        <div className="ht-empty">
          Your account is not linked to a patient record yet.
          <span className="mt-2 block text-xs">
            Please contact the Barangay Health Center of Mambog I so a health worker can link it.
          </span>
        </div>
      </div>
    );
  }

  const { patient, recordTypes, records, appointments } = healthInfo;
  const patientName = `${patient.first_name} ${patient.middle_name || ""} ${patient.last_name}`.replace(/\s+/g, " ").trim();
  const latestRecords = Object.fromEntries(
    ["vital-signs", "health-assessment", "allergies", "midwife-notes"].map((key) => [
      key,
      getLatestRecord(records[key] || [], recordTypes[key]?.dateField),
    ])
  );

  const requestedSection = searchParams.get("section");
  const section = requestedSection && (
    requestedSection === "appointments" ||
    requestedSection === "patient-information" ||
    Object.prototype.hasOwnProperty.call(recordTypes, requestedSection)
  ) ? requestedSection : null;

  const selectSection = (key) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("page", "health-information");
      nextParams.set("section", key);
      return nextParams;
    });
  };

  const showOverview = () => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("page", "health-information");
      nextParams.delete("section");
      return nextParams;
    });
  };

  return (
    <div className="patient-healthinfo-page">
      <aside className="patient-healthinfo-sidebar">
        <nav className="patient-healthinfo-nav" aria-label="Health information navigation">
          <button
            type="button"
            onClick={showOverview}
            className={`patient-sidebar-item ${section === null ? "is-active" : ""}`}
          >
            <span className="patient-sidebar-icon">
              <Home size={18} strokeWidth={1.8} />
            </span>
            <span>Overview</span>
          </button>

          <div className="patient-sidebar-label">MY HEALTH INFORMATION</div>

          <SidebarItem icon={Calendar} label="Appointments" active={section === "appointments"} onClick={() => selectSection("appointments")} />
          <SidebarItem icon={User} label="Patient Information" active={section === "patient-information"} onClick={() => selectSection("patient-information")} />
          <SidebarItem
            icon={Stethoscope}
            label="Health Assessment"
            active={section === "health-assessment"}
            expanded={["vital-signs", "midwife-notes", "allergies"].includes(section)}
            onClick={() => selectSection("health-assessment")}
          />
          <div className="patient-sidebar-children">
            <SidebarChild label="Vital Signs" active={section === "vital-signs"} onClick={() => selectSection("vital-signs")} />
            <SidebarChild label="Midwife Notes" active={section === "midwife-notes"} onClick={() => selectSection("midwife-notes")} />
            <SidebarChild label="Allergies" active={section === "allergies"} onClick={() => selectSection("allergies")} />
          </div>
          <SidebarItem icon={FileText} label="Medical History" active={section === "medical-history"} onClick={() => selectSection("medical-history")} />
        </nav>

      </aside>

      <main className="patient-healthinfo-main">
        {section === null ? (
          <>
            <header className="patient-overview-heading">
              <h1>Overview</h1>
              <p>Your latest health information from your most recent checkup.</p>
            </header>
            <LatestVitalSigns definition={recordTypes["vital-signs"]} record={latestRecords["vital-signs"]} />
            <LatestHealthAssessment definition={recordTypes["health-assessment"]} record={latestRecords["health-assessment"]} />
            <LatestAllergies definition={recordTypes.allergies} record={latestRecords.allergies} />
            <LatestMidwifeNotes definition={recordTypes["midwife-notes"]} record={latestRecords["midwife-notes"]} />
          </>
        ) : (
          <>

        <section className="patient-healthinfo-header-card">
          <div className="patient-healthinfo-header-copy">
            <div className="patient-panel-icon patient-panel-icon-large">
              <FileText size={22} strokeWidth={1.8} />
            </div>
            <div>
              <h1>My Health Information</h1>
              <p>Everything has been recorded here at the Barangay Health Center of Mambog I.</p>
            </div>
          </div>
          <span className="patient-readonly-pill">
            <Lock size={16} strokeWidth={1.8} />
            Read Only
          </span>
        </section>

        {section === "appointments" && <section className="patient-healthinfo-card">
            <div className="patient-card-header">
              <div className="patient-card-title">
                <span className="patient-panel-icon patient-panel-icon-small">
                  <Calendar size={18} strokeWidth={1.8} />
                </span>
                <h2>Appointments</h2>
              </div>
              <span className="patient-card-total">{appointments.length} total</span>
              <button type="button" className="patient-view-button" onClick={() => selectSection("appointments")}>
                View All
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="patient-empty-state">No appointments recorded.</div>
            ) : (
              <div className="patient-table-wrap">
                <table className="patient-health-table">
                  <thead>
                    <tr>
                      <th>Date and Time</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.appointment_id}>
                        <td className="patient-date-cell">{new Date(a.scheduled_at).toLocaleString()}</td>
                        <td>{a.reason}</td>
                        <td>
                          <span className="patient-status-pill">{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="patient-table-footer">Showing 1 to {appointments.length} of {appointments.length} appointments</div>
        </section>}

        {section === "patient-information" && <section className="patient-healthinfo-card">
            <div className="patient-card-header">
              <div className="patient-card-title">
                <span className="patient-panel-icon patient-panel-icon-small">
                  <User size={18} strokeWidth={1.8} />
                </span>
                <h2>Patient Information</h2>
              </div>
              <button type="button" className="patient-view-button" onClick={() => selectSection("patient-information")}>
                View All
              </button>
            </div>

            <div className="patient-information-grid">
              <InfoField label="Full Name" value={patientName || "Patient"} />
              <InfoField label="Gender" value={patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : null} />
              <InfoField label="Date of Birth" value={patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : null} />
              <InfoField label="Age" value={patient.age !== undefined ? `${patient.age} years old` : null} />
              <InfoField label="Contact Number" value={patient.contact_number} />
              <InfoField label="Address" value={patient.address} wide />
              <InfoField label="Blood Type" value={patient.blood_type} />
              <InfoField label="Civil Status" value={patient.civil_status} />
            </div>
        </section>}

        {Object.entries(recordTypes).map(([key, definition]) => section === key && (
          <RecordSection
            key={key}
            definition={definition}
            records={records[key] || []}
            onViewAll={() => selectSection(key)}
          />
        ))}
          </>
        )}
      </main>
    </div>
  );
}

function InfoField({ label, value, wide }) {
  return (
    <div className={`patient-info-field ${wide ? "patient-info-field-wide" : ""}`}>
      <span className="patient-info-label">{label}</span>
      <span className="patient-info-value">{value || "Not provided"}</span>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`patient-sidebar-item ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-expanded={expanded}
    >
      <span className="patient-sidebar-icon"><Icon size={18} strokeWidth={1.8} /></span>
      <span>{label}</span>
      {expanded !== undefined && <ChevronDown className={`patient-sidebar-chevron ${expanded ? "is-expanded" : ""}`} size={16} />}
    </button>
  );
}

function SidebarChild({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`patient-sidebar-child ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="patient-sidebar-child-dot" />
      <span>{label}</span>
    </button>
  );
}

function getLatestRecord(records, dateField) {
  if (!dateField || records.length === 0) return null;

  return records.reduce((latest, record) => {
    const recordTime = Date.parse(record[dateField]);
    const latestTime = latest ? Date.parse(latest[dateField]) : -Infinity;
    return Number.isFinite(recordTime) && (!Number.isFinite(latestTime) || recordTime > latestTime)
      ? record
      : latest;
  }, null) || records[0];
}

function formatRecordDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function getRecordFields(definition, record, keys) {
  if (!definition || !record) return [];
  return keys
    .filter((key) => record[key] !== null && record[key] !== undefined && record[key] !== "")
    .map((key) => {
      const field = definition.fields[key];
      const rawValue = record[key];
      return {
        key,
        label: field?.label || key,
        value: field?.type === "select" ? field.options?.[rawValue] || rawValue : rawValue,
      };
    });
}

function LatestRecordCard({ title, icon: Icon, type, definition, record, children }) {
  return (
    <section className={`patient-healthinfo-card patient-latest-card patient-latest-${type}`}>
      <header className="patient-latest-card-header">
        <div className="patient-latest-title">
          <Icon size={22} strokeWidth={2} />
          <h2>{title}</h2>
        </div>
        {record && formatRecordDate(record[definition.dateField]) && (
          <div className="patient-latest-date">
            <Calendar size={16} strokeWidth={1.8} />
            <span>{type === "assessment" ? "Assessment date:" : "Recorded on:"} {formatRecordDate(record[definition.dateField])}</span>
          </div>
        )}
      </header>
      <div className="patient-latest-card-content">
        {record ? children : <div className="patient-empty-state">No {definition.label.toLowerCase()} recorded yet.</div>}
      </div>
    </section>
  );
}

function LatestVitalSigns({ definition, record }) {
  const fields = getRecordFields(definition, record, Object.keys(definition?.fields || {}));
  const vitalIcons = {
    blood_pressure: HeartPulse,
    temperature: Activity,
    pulse_rate: HeartPulse,
    respiratory_rate: Activity,
    height_cm: User,
    weight_kg: Activity,
    bmi: Activity,
    oxygen_saturation: Droplets,
    pain_score: HeartPulse,
  };

  return (
    <LatestRecordCard title="Latest Vital Signs" icon={Activity} type="vitals" definition={definition} record={record}>
      {fields.length > 0 ? (
        <div className="patient-vital-grid">
          {fields.map(({ key, label, value }) => {
            const Icon = vitalIcons[key] || Activity;
            return (
              <div className={`patient-vital-item patient-vital-${key}`} key={key}>
                <Icon size={24} strokeWidth={1.8} />
                <span className="patient-vital-label">{label}</span>
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>
      ) : <div className="patient-empty-state">No vital signs recorded yet.</div>}
    </LatestRecordCard>
  );
}

function LatestHealthAssessment({ definition, record }) {
  const fields = getRecordFields(definition, record, ["condition", "description", "status", "medication", "remarks"]);

  return (
    <LatestRecordCard title="Latest Health Assessment" icon={ClipboardList} type="assessment" definition={definition} record={record}>
      {fields.length > 0 ? <RecordDetailRows fields={fields} /> : <div className="patient-empty-state">No health assessment recorded yet.</div>}
    </LatestRecordCard>
  );
}

function LatestAllergies({ definition, record }) {
  const fields = getRecordFields(definition, record, Object.keys(definition?.fields || {}));

  return (
    <LatestRecordCard title="Latest Allergies" icon={TriangleAlert} type="allergies" definition={definition} record={record}>
      {fields.length > 0 ? <RecordDetailRows fields={fields} /> : <div className="patient-empty-state">No allergies recorded yet.</div>}
    </LatestRecordCard>
  );
}

function LatestMidwifeNotes({ definition, record }) {
  const note = record?.notes;

  return (
    <LatestRecordCard title="Latest Midwife Notes" icon={FileText} type="notes" definition={definition} record={record}>
      {note ? <p className="patient-latest-note">{note}</p> : <div className="patient-empty-state">No midwife notes recorded yet.</div>}
    </LatestRecordCard>
  );
}

function RecordDetailRows({ fields }) {
  return (
    <dl className="patient-latest-detail-list">
      {fields.map(({ key, label, value }) => (
        <div className="patient-latest-detail-row" key={key}>
          <dt>{key === "condition" ? "Condition / Illness" : label}</dt>
          <dd>{key === "status" ? <span className="patient-status-pill">{value}</span> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordSection({
  definition,
  records,
  title = definition.label,
  emptyMessage,
  showTotal = true,
  onViewAll,
}) {
  const columnFields = Object.entries(definition.fields).filter(([, f]) => f.column || f.primary);

  return (
    <section className="patient-healthinfo-card">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <FileText size={18} strokeWidth={1.8} />
          </span>
            <h2>{title}</h2>
        </div>
          {showTotal && <span className="patient-card-total">{records.length} total</span>}
          {onViewAll && (
            <button type="button" className="patient-view-button" onClick={onViewAll}>
              View All
            </button>
          )}
      </div>

      {records.length === 0 ? (
        <div className="patient-empty-state">
          {emptyMessage || `No ${definition.label.toLowerCase()} recorded.`}
        </div>
      ) : (
        <div className="patient-table-wrap">
          <table className="patient-health-table">
            <thead>
              <tr>
                {columnFields.map(([column, field]) => (
                  <th key={column}>{field.label}</th>
                ))}
                <th>{definition.dateLabel}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.record_id}>
                  {columnFields.map(([column, field]) => (
                    <td key={column}>
                      {field.type === "select"
                        ? record[column]
                          ? field.options?.[record[column]] || record[column]
                          : "--"
                        : record[column] || "--"}
                    </td>
                  ))}
                  <td className="patient-date-cell">{new Date(record[definition.dateField]).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="patient-table-footer">Showing latest {definition.label.toLowerCase()}</div>
    </section>
  );
}