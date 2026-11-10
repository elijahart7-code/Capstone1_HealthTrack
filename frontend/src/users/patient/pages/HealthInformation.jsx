import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { getCurrentUser } from "../../../lib/auth";
import { ClinicalRecordSections } from "../../../shared/patients/ClinicalRecordSections";
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
  CalendarDays,
  Clock3,
  UserRound,
  MessageSquare,
  CircleCheck,
  Scissors,
  Hospital,
  UsersRound,
  Syringe,
  ArrowRight,
  Pencil,
  Briefcase,
  IdCard,
  MapPin,
  Phone,
  PhoneCall,
  Flag,
  Info,
  ShieldPlus,
} from "lucide-react";

const SECTION_ICONS = {
  appointments: Calendar,
  "patient-information": User,
  "vital-signs": Activity,
  "midwife-notes": FileText,
  "medical-history": FileText,
  allergies: Activity,
};

const HEALTH_ASSESSMENT_CHILD_SECTIONS = [
  "health-assessment",
  "vital-signs",
  "allergies",
  "medical-history",
  "midwife-notes",
];
export function HealthInformation({ healthInfo }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSection = searchParams.get("section");
  const [assessmentExpanded, setAssessmentExpanded] = useState(() =>
    HEALTH_ASSESSMENT_CHILD_SECTIONS.includes(currentSection)
  );

  useEffect(() => {
    if (HEALTH_ASSESSMENT_CHILD_SECTIONS.includes(currentSection)) {
      setAssessmentExpanded(true);
    }
  }, [currentSection]);

  if (!healthInfo?.patient) {
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

  const patient = healthInfo.patient;
  const currentUser = getCurrentUser();
  const recordTypes = healthInfo.recordTypes || {};
  const records = healthInfo.records || {};
  const appointments = healthInfo.appointments || [];
  const now = Date.now();
  
const sortedAppointments = [...appointments]
  .filter((appointment) =>
    appointment?.scheduled_at &&
    Number.isFinite(Date.parse(appointment.scheduled_at))
  )
  .sort(
    (a, b) =>
      Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at)
  );

const upcomingAppointment =
  sortedAppointments
    .filter((appointment) => {
      const scheduledTime = Date.parse(appointment.scheduled_at);
      const status = appointment.status?.toLowerCase();

      return (
        scheduledTime >= now &&
        status !== "completed" &&
        status !== "cancelled"
      );
    })
    .sort(
      (a, b) =>
        Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)
    )[0] ||
  sortedAppointments[0] ||
  null;

  const patientName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");
  const latestRecords = Object.fromEntries(
    ["vital-signs", "health-assessment", "allergies", "medical-history", "midwife-notes"].map((key) => [
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
    <div className={`patient-healthinfo-page${["health-assessment", "vital-signs", "allergies", "medical-history", "midwife-notes"].includes(section) ? " patient-healthinfo-page-records" : ""}`}>
      {section !== null && (
        <section className="patient-healthinfo-header-card">
          <div className="patient-healthinfo-header-copy">
            <div className="patient-panel-icon patient-panel-icon-large">
              <FileText size={30} strokeWidth={1.8} />
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
      )}
      <aside className="patient-healthinfo-sidebar">
        <nav className="patient-healthinfo-nav" aria-label="Health information navigation">
          <button
            type="button"
            onClick={showOverview}
            className={`patient-sidebar-item patient-sidebar-summary-item ${section === null ? "is-active" : ""}`}
          >
            <span className="patient-sidebar-icon">
              <Home size={30} strokeWidth={1.8} />
            </span>
            <span>Latest Health Summary</span>
          </button>

          <div className="patient-sidebar-label">MY HEALTH INFORMATION</div>

          <SidebarItem icon={User} label="Personal Information" active={section === "patient-information"} onClick={() => selectSection("patient-information")} />
          <SidebarItem icon={Calendar} label="Appointments" active={section === "appointments"} onClick={() => selectSection("appointments")} />
          <SidebarItem
            icon={Stethoscope}
            label="Medical Records"
            active={section === "health-assessment"}
            expanded={assessmentExpanded}
            onClick={() => {
              setAssessmentExpanded(true);
              selectSection("health-assessment");
            }}
            onToggle={() => setAssessmentExpanded((expanded) => !expanded)}
          />
        </nav>

      </aside>

      <main className={`patient-healthinfo-main${section === null ? " patient-healthinfo-main-overview" : ""}`}>
        {section === null ? (
          <>
            <header className="patient-overview-heading">
              <h1>Latest Health Summary</h1>
              <p>This is your latest health information from your most recent checkup.</p>
              <span className="ht-header-logout patient-overview-readonly" aria-label="Read only">
                <Lock size={18} strokeWidth={1.9} />
                Read Only
              </span>
            </header>
            <LatestAppointment
              appointment={upcomingAppointment}
              hasAppointmentHistory={appointments.length > 0}
              onViewAppointments={() => selectSection("appointments")}
              collapsible
            />
            <LatestHealthAssessment definition={recordTypes["health-assessment"]} record={latestRecords["health-assessment"]} onViewAssessments={() => selectSection("health-assessment")} collapsible />
            <LatestVitalSigns definition={recordTypes["vital-signs"]} record={latestRecords["vital-signs"]} onViewVitalSigns={() => selectSection("health-assessment")} collapsible />
            <LatestMidwifeNotes definition={recordTypes["midwife-notes"]} record={latestRecords["midwife-notes"]} onViewMidwifeNotes={() => selectSection("health-assessment")} collapsible />
            <LatestAllergies definition={recordTypes.allergies} record={latestRecords.allergies} onViewAllergies={() => selectSection("health-assessment")} collapsible />
            <LatestMedicalHistory definition={recordTypes["medical-history"]} record={latestRecords["medical-history"]} onViewMedicalHistory={() => selectSection("health-assessment")} collapsible /> </>
        ) : (
          <>

        {section === "appointments" && <section className="patient-healthinfo-card patient-appointments-card">
            <div className="patient-card-header">
              <h2 className="ht-appointments-heading">
                <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
                Appointments
              </h2>
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
                    {appointments.map((a) => {
                      const appointmentStatus = (a.status || "pending").toLowerCase();
                      const status = appointmentStatus === "pending" ? "confirmed" : appointmentStatus;
                      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

                      return (
                        <tr key={a.appointment_id}>
                          <td className="patient-date-cell">{new Date(a.scheduled_at).toLocaleString()}</td>
                          <td>{a.reason}</td>
                          <td>
                            <span
                              className={`patient-appointment-status patient-appointment-status-${status}`}
                              aria-label={`Appointment status: ${statusLabel}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

        </section>}

        {section === "patient-information" && <section className="patient-healthinfo-card patient-information-card">
            <div className="patient-card-header">
              <div className="patient-card-title">
                <h2 className="ht-patient-section-heading">
                  <span className="ht-section-heading-icon ht-section-heading-icon-general" aria-hidden="true">
                    <FileText className="ht-section-heading-icon-main" size={25} />
                    <Info className="ht-section-heading-icon-badge" size={15} />
                  </span>
                  General Information
                </h2>
              </div>
            </div>

            <div className="patient-information-grid">
              <InfoField icon={User} label="Full Name" value={patientName} />
              <InfoField icon={UserRound} label="Sex" value={patient.sex} />
              <InfoField icon={MapPin} label="Address" value={patient.address} />
              <InfoField icon={CalendarDays} label="Date of Birth" value={patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : null} />
              <InfoField icon={Clock3} label="Age" value={patient.age != null ? `${patient.age} years old` : null} />
              <InfoField icon={Phone} label="Contact Number" value={patient.contact_number} />
              <InfoField icon={HeartPulse} label="Civil Status" value={patient.civil_status} />
              <InfoField icon={Droplets} label="Blood Type" value={patient.blood_type} />
              <InfoField icon={Briefcase} label="Occupation" value={patient.occupation} />
              <InfoField icon={IdCard} label="Barangay ID Number" value={patient.barangay_id_number} />
              <InfoField icon={Flag} label="Nationality" value={patient.nationality} />
              <InfoField icon={MapPin} label="Place of Birth" value={patient.place_of_birth} />
            </div>
            <div className="patient-information-emergency-row">
              <InfoField icon={UsersRound} label="Emergency Contact" value={patient.emergency_contact_name} />
              <InfoField icon={PhoneCall} label="Emergency Contact Number" value={patient.emergency_contact_number} />
              <InfoField icon={UserRound} label="Relationship" value={patient.emergency_contact_relationship} />
            </div>
        </section>}

        {section === "patient-information" && (
          <PatientPortalAccount patient={patient} currentUser={currentUser} />
        )}

        {[
  "health-assessment",
  "vital-signs",
  "allergies",
  "medical-history",
  "midwife-notes",
].includes(section) ? (
  <HealthAssessmentHistory
    recordTypes={recordTypes}
    records={records}
    appointments={appointments}
  />
) : (
  Object.entries(recordTypes).map(([key, definition]) =>
    section === key ? (
      <RecordSection
        key={key}
        definition={definition}
        records={records[key] || []}
        onViewAll={() => selectSection(key)}
      />
    ) : null
  )
)}
          </>
        )}
      </main>
    </div>
  );
}

function PatientPortalAccount({ patient, currentUser }) {
  const accountCreatedAt = patient.account_created_at || patient.user_created_at;
  const accountCreatedDate = accountCreatedAt && Number.isFinite(Date.parse(accountCreatedAt))
    ? new Date(accountCreatedAt).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "Not available";

  return (
    <section className="patient-healthinfo-card patient-general-account-card ht-portal-card" aria-labelledby="patient-general-account-title">
      <div className="ht-card-heading">
        <h2 id="patient-general-account-title" className="ht-patient-section-heading">
          <span className="ht-section-heading-icon ht-section-heading-icon-portal" aria-hidden="true">
            <UserRound className="ht-section-heading-icon-main" size={23} />
            <ShieldPlus className="ht-section-heading-icon-badge" size={18} />
          </span>
          Patient Portal Account
        </h2>
      </div>
      <div className="ht-portal-info">
        <div className="ht-portal-avatar" aria-label="Verified patient account">
          <UserRound size={46} strokeWidth={1.8} aria-hidden="true" />
          <span className="ht-portal-check" aria-hidden="true">
            <CircleCheck size={19} strokeWidth={2.4} />
          </span>
        </div>
        <div className="ht-portal-details">
          <div className="ht-portal-detail">
            <span>Account Status:</span>
            <span className={`patient-general-account-status ${patient.user_id ? "is-active" : "is-inactive"}`}>
              {patient.user_id ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="ht-portal-detail">
            <span>Email Address:</span>
            <strong>{patient.email || patient.portal_email || currentUser?.email || "Not available"}</strong>
          </div>
          <div className="ht-portal-detail">
            <span>Account Created:</span>
            <strong>{accountCreatedDate}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="patient-info-field">
      <span className="patient-info-icon" aria-hidden="true">
        <Icon size={30} strokeWidth={1.8} />
      </span>
      <span className="patient-info-copy">
        <span className="patient-info-label">{label}</span>
        <span className="patient-info-value">{value || "Not provided"}</span>
      </span>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, expanded, onClick, onToggle }) {
  if (onToggle) {
    return (
      <div className="patient-sidebar-item-row">
        <button
          type="button"
          onClick={onClick}
          className={`patient-sidebar-item patient-sidebar-item-main ${active ? "is-active" : ""}`}
          aria-current={active ? "page" : undefined}
        >
          <span className="patient-sidebar-icon"><Icon size={30} strokeWidth={1.8} /></span>
          <span>{label}</span>
        </button>
        
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`patient-sidebar-item ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="patient-sidebar-icon"><Icon size={30} strokeWidth={1.8} /></span>
      <span>{label}</span>
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
    .filter((key) => hasRecordValue(record[key]))
    .map((key) => {
      const field = definition.fields[key];
      const rawValue = record[key];
      return {
        key,
        label: field?.label || key,
        value: ["select", "combobox"].includes(field?.type)
          ? field.options?.[rawValue] || rawValue
          : rawValue,
      };
    });
}

function hasRecordValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function getMidwifeNoteLines(value) {
  if (!hasRecordValue(value)) return [];

  return String(value)
    .replace(/\r\n/g, "\n")
    .split(/\n|\s+-\s+/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function getRecordMetadata(record, definition) {
  const recordedBy =
    record?.created_by_name ||
    record?.createdByName ||
    record?.recorded_by_name ||
    record?.recordedByName ||
    record?.created_by ||
    record?.recorded_by;

  return [
    {
      key: "record-date",
      label: definition?.label === "Health Assessment"
        ? "Assessment Date"
        : definition?.dateLabel?.trim() || "Date Recorded",
      value: formatRecordDate(record?.[definition?.dateField]) || "--",
    },
    {
      key: "recorded-by",
      label: "Recorded By",
      value: recordedBy || "Not recorded",
    },
  ];
}

function LatestRecordCard({ title, icon: Icon, type, definition, record, action, children, embedded = false, collapsible = false }) {
  const [isExpanded, setIsExpanded] = useState(!collapsible);
  const headerDate = type === "notes"
    ? formatRecordDateTime(record?.created_at)
    : formatRecordDate(record?.[definition.dateField]);

  if (embedded) {
    return record
      ? <div className="patient-latest-card-content">{children}</div>
      : <div className="patient-empty-state">No {definition.label.toLowerCase()} recorded for this consultation.</div>;
  }

  return (
    <section className={`patient-healthinfo-card patient-latest-card patient-latest-${type}`}>
      <header className="patient-latest-card-header">
        {collapsible ? (
          <button
            type="button"
            className="patient-latest-title patient-latest-toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            <Icon size={22} strokeWidth={2} />
            <span className="patient-latest-toggle-heading" role="heading" aria-level="2">{title}</span>
            <ChevronDown className="patient-latest-toggle-chevron" size={18} strokeWidth={2} />
          </button>
        ) : (
          <div className="patient-latest-title">
            <Icon size={22} strokeWidth={2} />
            <h2>{title}</h2>
          </div>
        )}
        {record &&
  headerDate &&
  type !== "assessment" &&
  type !== "vitals" &&
  type !== "allergies" && 
  type !== "medical-history" &&
  type !== "midwife-notes" && (
    <div className="patient-latest-date">
      <Calendar size={16} strokeWidth={1.8} />
      <span>Recorded on: {headerDate}</span>
    </div>
)}
        {action}
      </header>
      {(!collapsible || isExpanded) && (
        <div className="patient-latest-card-content">
          {record ? children : <div className="patient-empty-state">No {definition.label.toLowerCase()} recorded yet.</div>}
        </div>
      )}
    </section>
  );
}



function LatestAppointment({
  appointment,
  hasAppointmentHistory,
  onViewAppointments,
  collapsible = false,
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsible);
  const appointmentStatus = (appointment?.status || "").toLowerCase();
  const normalizedStatus = appointmentStatus === "pending" ? "confirmed" : appointmentStatus;
  const statusLabel = normalizedStatus
    ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
    : "--";
  const columns = [
    {
      key: "scheduled_at",
      label: "Appointment Date",
      value: appointment?.scheduled_at
        ? new Date(appointment.scheduled_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "--",
    },
    {
      key: "time",
      label: "Time",
      value: appointment?.scheduled_at
        ? new Date(appointment.scheduled_at).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })
        : "--",
    },
    {
      key: "reason",
      label: "Reason",
      value: appointment?.reason || "--",
    },
    {
      key: "status",
      label: "Status",
    },
  ];

  return (
    <section className="patient-healthinfo-card patient-latest-card patient-latest-appointment-card">
      <header className="patient-latest-card-header">
        {collapsible ? (
          <button
            type="button"
            className="patient-latest-title patient-latest-toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            <CalendarDays size={22} strokeWidth={2} />
            <span className="patient-latest-toggle-heading" role="heading" aria-level="2">Latest Appointment</span>
            <ChevronDown className="patient-latest-toggle-chevron" size={18} strokeWidth={2} />
          </button>
        ) : (
          <div className="patient-latest-title">
            <CalendarDays size={22} strokeWidth={2} />
            <h2>Latest Appointment</h2>
          </div>
        )}

        <button
          type="button"
          className="patient-appointment-link"
          onClick={onViewAppointments}
        >
          View All Appointments
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      </header>

      {(!collapsible || isExpanded) && (
        <div className="patient-latest-card-content">
          {appointment ? (
            <div className="patient-table-wrap">
              <table className="patient-health-table">
                <thead>
                  <tr>
                    {columns.map(({ key, label }) => (
                      <th scope="col" key={key}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    {columns.map(({ key, value }) => (
                      <td key={key}>
                        {key === "status"
                          ? <span className={`patient-appointment-status patient-latest-appointment-status patient-latest-appointment-status-${normalizedStatus || "unknown"}`}>{statusLabel}</span>
                          : value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="patient-empty-state">
              {hasAppointmentHistory
                ? "No appointment details available."
                : "No appointments recorded."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}



function LatestVitalSigns({ definition, record, onViewVitalSigns, showAction = true, embedded = false, collapsible = false }) {
  const tableRecords = record ? [record] : [];
  const vitalRows = Object.keys(definition?.fields || {})
    .filter((key) => VITAL_SIGN_PRESENTATION[key] && tableRecords.some((item) => hasRecordValue(item[key])))
    .map((key) => ({ key, ...VITAL_SIGN_PRESENTATION[key] }));
  const metadata = getRecordMetadata(tableRecords[0] || record, definition).map((column) => ({
    ...column,
    label: column.key === "record-date" ? "Date\nRecorded" : "Recorded\nBy",
  }));
  const columns = [...vitalRows, ...metadata];
  const cardRecord = tableRecords[0] || record;

  return (
    <LatestRecordCard
  title="Latest Vital Signs"
  icon={Activity}
  type="vitals"
  definition={definition}
  record={cardRecord}
  embedded={embedded}
  collapsible={collapsible}
  action={showAction && (
    <button
      type="button"
      className="patient-appointment-link"
      onClick={onViewVitalSigns}
    >
      View All Vital Signs
      <ArrowRight size={16} strokeWidth={1.8} />
    </button>
  )}
>
      {tableRecords.length > 0 ? (
        <div className="patient-table-wrap patient-vital-horizontal-wrap patient-overview-horizontal-scroll" tabIndex={0}>
          <table className="patient-health-table patient-vital-horizontal-table">
            <thead>
              <tr>
                {columns.map(({ key, label }) => (
                  <th scope="col" key={key}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRecords.map((row) => (
                <tr key={row.record_id}>
                  {columns.map(({ key, unit }) => (
                    <td key={key}>
                      {unit ? (
                        <>
                          <span className="patient-vital-value">{row[key] || "--"}</span>
                          <span className="patient-vital-unit">{unit}</span>
                        </>
                      ) : getRecordMetadata(row, definition).find((item) => item.key === key)?.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No vital signs recorded yet.
        </div>
      )}
    </LatestRecordCard>
  );
}


function LatestHealthAssessment({
  definition,
  record,
  onViewAssessments,
  showAction = true,
  embedded = false,
  collapsible = false,
}) {
  const tableRecords = record ? [record] : [];
  const assessmentItems = Object.keys(definition?.fields || {})
    .filter((key) => tableRecords.some((item) => hasRecordValue(item[key])))
    .map((key) => ({
      key,
      label: definition.fields[key].label,
    }));
  const columns = [...assessmentItems, ...getRecordMetadata(tableRecords[0] || record, definition)];
  const cardRecord = tableRecords[0] || record;

  return (
    <LatestRecordCard
      title="Latest Health Assessment"
      icon={ClipboardList}
      type="assessment"
      definition={definition}
      record={cardRecord}
      embedded={embedded}
      collapsible={collapsible}
      action={showAction && (
        <button
          type="button"
          className="patient-appointment-link"
          onClick={onViewAssessments}
        >
          View All Health Assessments
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      )}
    >
      {tableRecords.length > 0 ? (
        <div className="patient-table-wrap patient-assessment-horizontal-wrap patient-overview-horizontal-scroll" tabIndex={0}>
          <table className="patient-health-table patient-assessment-horizontal-table">
            <thead>
              <tr>
                {columns.map(({ key, label }) => (
                  <th scope="col" key={key}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRecords.map((row) => (
                <tr key={row.record_id}>
                  {columns.map(({ key }) => {
                    const fieldValue = key === "record-date" || key === "recorded-by"
                      ? getRecordMetadata(row, definition).find((item) => item.key === key)?.value
                      : getRecordFields(definition, row, [key])[0]?.value || "--";
                    return (
                      <td
                        key={key}
                        className={
                          key === "remarks"
                            ? "patient-assessment-remarks-cell"
                            : key === "description"
                              ? "patient-assessment-description-cell"
                              : undefined
                        }
                      >
                        {key === "remarks"
                          ? <span className="patient-assessment-remarks">{fieldValue}</span>
                          : key === "description"
                            ? <span className="patient-assessment-description">{fieldValue}</span>
                            : fieldValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </LatestRecordCard>
  );
}


function LatestAllergies({
  definition,
  record,
  onViewAllergies,
  showAction = true,
  embedded = false,
  collapsible = false,
}) {
  const tableRecords = record ? [record] : [];
  const fields = Object.keys(definition?.fields || {})
    .filter((key) => tableRecords.some((item) => hasRecordValue(item[key])))
    .map((key) => ({ key, label: definition.fields[key].label }));

  const labelOverrides = {
    medication_allergies: "Medication\nAllergies",
    food_allergies: "Food\nAllergies",
    environmental_allergies: "Environmental\nAllergies",
    "record-date": "Date\nRecorded",
    "recorded-by": "Recorded\nBy",
  };
  const rows = [...fields, ...getRecordMetadata(tableRecords[0] || record, definition)].map((item) => ({
    ...item,
    label: labelOverrides[item.key] || item.label,
  }));

  return (
    <LatestRecordCard
      title="Latest Allergies"
      icon={TriangleAlert}
      type="allergies"
      definition={definition}
      record={tableRecords[0] || record}
      embedded={embedded}
      collapsible={collapsible}
      action={showAction && (
        <button
          type="button"
          className="patient-appointment-link"
          onClick={onViewAllergies}
        >
          View All Allergies
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      )}
    >
      <AllergyDetailRows rows={rows} records={tableRecords} definition={definition} />
    </LatestRecordCard>
  );
}

function LatestMidwifeNotes({ definition, record, onViewMidwifeNotes, showAction = true, embedded = false, collapsible = false }) {
  const tableRecords = record ? [record] : [];
  const noteItems = Object.keys(definition?.fields || {})
    .filter((key) => tableRecords.some((item) => hasRecordValue(item[key])))
    .map((key) => ({ key, label: definition.fields[key].label }));
  const columns = [...noteItems, ...getRecordMetadata(tableRecords[0] || record, definition)];
  const cardRecord = tableRecords[0] || record;

  return (
     <LatestRecordCard
  title="Latest Midwife Notes"
  icon={ClipboardList}
  type="midwife-notes"
  definition={definition}
  record={cardRecord}
  embedded={embedded}
  collapsible={collapsible}
  action={showAction && (
    <button
      type="button"
      className="patient-appointment-link"
      onClick={onViewMidwifeNotes}
    >
      View All Midwife Notes
      <ArrowRight size={16} strokeWidth={1.8} />
    </button>
  )}
>
      {tableRecords.length > 0 ? (
        <div className="patient-table-wrap patient-midwife-horizontal-wrap patient-overview-horizontal-scroll" tabIndex={0}>
          <table className="patient-health-table patient-midwife-horizontal-table">
            <thead>
              <tr>
                {columns.map(({ key, label }) => (
                  <th scope="col" key={key}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRecords.map((row) => (
                <tr key={row.record_id}>
                  {columns.map(({ key }) => {
                    const value = key === "record-date" || key === "recorded-by"
                      ? getRecordMetadata(row, definition).find((item) => item.key === key)?.value
                      : getRecordFields(definition, row, [key])[0]?.value || "--";
                    return (
                      <td key={key}>
                        {key === "notes" ? (
                          <div className="patient-midwife-value patient-midwife-note-lines">
                            {getMidwifeNoteLines(value).map((line, index) => (
                              <div key={`${index}-${line}`}>- {line}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="patient-midwife-value">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No midwife notes recorded yet.
        </div>
      )}
    </LatestRecordCard>
  );
}
function LatestMedicalHistory({
  definition,
  record,
  onViewMedicalHistory,
  showAction = true,
  embedded = false,
  collapsible = false,
}) {
  const tableRecords = record ? [record] : [];
  const rows = [
    {
      key: "past_illnesses",
      label: "Past\nIllnesses",
    },
    {
      key: "chronic_conditions",
      label: "Chronic\nConditions",
    },
    {
      key: "past_surgeries",
      label: "Past\nSurgeries",
    },
    {
      key: "previous_hospitalizations",
      label: "Previous\nHospitalizations",
    },
    {
      key: "family_medical_history",
      label: "Family Health\nHistory",
    },
    {
      key: "immunization_status",
      label: "Immunization\nStatus",
    },
  ].filter(({ key }) => tableRecords.some((item) => hasRecordValue(item[key])));
  const columns = [...rows, ...getRecordMetadata(tableRecords[0] || record, definition)].map((item) => ({
    ...item,
    label: item.key === "record-date"
      ? "Date\nRecorded"
      : item.key === "recorded-by"
        ? "Recorded\nBy"
        : item.label,
  }));
  const cardRecord = tableRecords[0] || record;

  return (
    <LatestRecordCard
      title="Latest Health Background"
      icon={FileText}
      type="medical-history"
      definition={definition}
      record={cardRecord}
      embedded={embedded}
      collapsible={collapsible}
      action={showAction && (
        <button
          type="button"
          className="patient-appointment-link"
          onClick={onViewMedicalHistory}
        >
          View Health Background
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      )}
    >
      {tableRecords.length > 0 ? (
        <div className="patient-table-wrap patient-medical-history-latest-wrap patient-overview-horizontal-scroll" tabIndex={0}>
          <table className="patient-health-table patient-medical-history-latest-table">
            <thead>
              <tr>
                {columns.map(({ key, label }) => (
                  <th scope="col" key={key}>
                    {label.split("\n").map((line, index) => (
                      <span className="patient-health-background-header-line" key={`${key}-${index}`}>
                        {line}
                      </span>
                    ))}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tableRecords.map((row) => (
                <tr key={row.record_id}>
                  {columns.map(({ key }) => {
                    const value = key === "record-date" || key === "recorded-by"
                      ? getRecordMetadata(row, definition).find((item) => item.key === key)?.value
                      : getRecordFields(definition, row, [key])[0]?.value || "--";
                    return <td key={key}>{value}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No health background recorded yet.
        </div>
      )}
    </LatestRecordCard>
  );
}
function AllergyDetailRows({ rows, records, definition }) {
  return (
    <div className="patient-table-wrap patient-allergies-horizontal-wrap patient-overview-horizontal-scroll" tabIndex={0}>
  <table className="patient-health-table patient-allergies-horizontal-table">
    <thead>
      <tr>
        {rows.map(({ key, label }) => (
          <th scope="col" key={key}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {records.map((record) => (
        <tr key={record.record_id}>
          {rows.map(({ key }) => {
            const value = key === "record-date" || key === "recorded-by"
              ? getRecordMetadata(record, definition).find((item) => item.key === key)?.value
              : getRecordFields(definition, record, [key])[0]?.value || "--";
            return <td key={key}>{value}</td>;
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>
  );
}
function HealthAssessmentHistory({
  recordTypes,
  records,
  appointments,
}) {
  const recordKeys = ["health-assessment", "vital-signs", "midwife-notes", "allergies", "medical-history"];
  const sectionDetails = [
    { key: "health-assessment", label: "Health Assessment" },
    { key: "vital-signs", label: "Vital Signs" },
    { key: "midwife-notes", label: "Midwife Notes" },
    { key: "allergies", label: "Allergies" },
    { key: "medical-history", label: "Health Background" },
  ];
  const groupedAppointments = appointments.map((appointment) => ({
    ...appointment,
    groupedRecords: Object.fromEntries(recordKeys.map((key) => [
      key,
      (records[key] || []).filter((record) => record.appointment_id === appointment.appointment_id),
    ])),
  })).filter((appointment) => recordKeys.some((key) => appointment.groupedRecords[key].length > 0));
  const unlinkedRecords = Object.fromEntries(recordKeys.map((key) => [
    key,
    (records[key] || []).filter((record) => !record.appointment_id),
  ]));
  const hasUnlinkedRecords = recordKeys.some((key) => unlinkedRecords[key].length > 0);
  const [openRecordIds, setOpenRecordIds] = useState(() => new Set());

  const toggleRecord = (recordId) => {
    setOpenRecordIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const renderRecordSection = (key, appointmentRecords) => {
    const sectionRecords = appointmentRecords[key];
    const definition = recordTypes[key];
    return sectionRecords.map((record) => {
      const commonProps = {
        key: record.record_id,
        definition,
        record,
        showAction: false,
        embedded: true,
      };

      if (key === "vital-signs") return <LatestVitalSigns {...commonProps} />;
      if (key === "health-assessment") return <LatestHealthAssessment {...commonProps} />;
      if (key === "midwife-notes") return <LatestMidwifeNotes {...commonProps} />;
      if (key === "medical-history") return <LatestMedicalHistory {...commonProps} />;
      return <LatestAllergies {...commonProps} />;
    });
  };

  const renderConsultationRecord = (recordId, appointment, appointmentRecords) => {
    const isRecordOpen = openRecordIds.has(recordId);
    const statusValue = appointment?.status?.toLowerCase() || "";
    const status = statusValue === "pending" ? "confirmed" : statusValue;
    const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
    const detailsId = `patient-consultation-${recordId}-sections`;

    return (
      <tbody key={recordId}>
        <tr className="patient-consultation-record-row">
          <td>
            <div className="patient-consultation-record-title">
              <strong>CONSULTATION RECORD</strong>
              <span>{appointment?.reason || "Unlinked Records"}</span>
            </div>
          </td>
          <td>
            {appointment?.scheduled_at
              ? <time dateTime={appointment.scheduled_at}>{new Date(appointment.scheduled_at).toLocaleString()}</time>
              : "--"}
          </td>
          <td>
            {statusLabel && <span className={`ht-appointment-record-status ht-appointment-record-status-${status}`}>{statusLabel}</span>}
          </td>
          <td>
            <button
              type="button"
              className="patient-consultation-record-toggle"
              onClick={() => toggleRecord(recordId)}
              aria-expanded={isRecordOpen}
              aria-controls={detailsId}
            >
              <ChevronDown size={16} className={isRecordOpen ? "is-expanded" : ""} />
              {isRecordOpen ? "Hide Record" : "View Record"}
            </button>
          </td>
        </tr>
        {isRecordOpen && (
          <tr id={detailsId} className="patient-consultation-record-details">
            <td colSpan={4}>
              <ClinicalRecordSections
                sections={sectionDetails}
                resetKey={recordId}
                className="patient-consultation-record-sections"
                renderSection={key => (
                  <div className="patient-consultation-section-content">
                    {renderRecordSection(key, appointmentRecords)}
                  </div>
                )}
              />
            </td>
          </tr>
        )}
      </tbody>
    );
  };

  return (
    <div className="patient-consultation-record-list">
      <div className="patient-consultation-record-list-title">
        <span className="patient-panel-icon patient-panel-icon-small">
          <Stethoscope size={18} strokeWidth={1.8} />
        </span>
        <h2>Medical Records</h2>
      </div>
      {groupedAppointments.length || hasUnlinkedRecords ? (
        <div className="patient-consultation-record-scroll">
          <table className="patient-consultation-record-table">
            <thead>
              <tr>
                <th scope="col">Consultation</th>
                <th scope="col">Date and Time</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            {groupedAppointments.map((appointment) => renderConsultationRecord(
              appointment.appointment_id,
              appointment,
              appointment.groupedRecords
            ))}
            {hasUnlinkedRecords && renderConsultationRecord("unlinked-records", null, unlinkedRecords)}
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">No medical records are linked to an appointment yet.</div>
      )}
    </div>
  );
}

function MedicalHistorySection({ definition, records }) {
  const rows = [
    { key: "past_illnesses", label: "Past Illnesses" },
    { key: "chronic_conditions", label: "Chronic Conditions" },
    { key: "past_surgeries", label: "Past Surgeries" },
    { key: "previous_hospitalizations", label: "Previous Hospitalizations" },
    { key: "family_medical_history", label: "Family Health History" },
    { key: "immunization_status", label: "Immunization Status" },
  ];

  return (
    <section className="patient-healthinfo-card patient-medical-history-card">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <FileText size={18} strokeWidth={1.8} />
          </span>
          <h2>Health Background</h2>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="patient-table-wrap patient-medical-history-table-wrap">
          <table className="patient-health-table patient-medical-history-table">
            <thead>
              <tr>
                {rows.map(({ key, label }) => (
                  <th scope="col" key={key}>
                    {label}
                  </th>
                ))}
                <th scope="col">
                  Recorded On
                </th>
                <th scope="col">
                  Recorded By
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.record_id}>
                  {rows.map(({ key }) => (
                    <td key={key}>
                      {record[key] || (
                        ["past_illnesses", "chronic_conditions", "past_surgeries", "previous_hospitalizations"].includes(key)
                          ? "None"
                          : "Not provided"
                      )}
                    </td>
                  ))}

                  <td>
                    {formatRecordDate(
                      record[definition.dateField]
                    ) || "--"}
                  </td>

                  <td>
                    {record.created_by_name ||
                      record.created_by ||
                      "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No health background recorded.
        </div>
      )}
    </section>
  );
}

function formatRecordDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AssessmentDetailRows({ fields, assessmentDate, recordedOn, recordedBy }) {
  const fieldValues = Object.fromEntries(fields.map(({ key, value }) => [key, value]));
  const icons = {
    condition: Stethoscope,
    description: FileText,
    assessmentDate: Calendar,
    status: CircleCheck,
    remarks: MessageSquare,
    recordedOn: Clock3,
  };
  const rows = [
    { key: "condition", label: "Condition", icon: icons.condition, value: fieldValues.condition },
    { key: "description", label: "Description", icon: icons.description, value: fieldValues.description },
    { key: "assessmentDate", label: "Assessment Date", icon: icons.assessmentDate, value: formatRecordDate(assessmentDate) },
    { key: "status", label: "Status", icon: icons.status, value: fieldValues.status },
    { key: "remarks", label: "Remarks", icon: icons.remarks, value: fieldValues.remarks },
    { key: "recordedOn", label: "Recorded on", icon: icons.recordedOn, value: recordedOn },
    { key: "recordedBy", label: "Recorded by", icon: User, value: recordedBy },
  ];

  return (
    <dl className="patient-assessment-record-list">
      {rows.map(({ key, label, icon: Icon, value }) => (
        <div className="patient-assessment-record-row" key={key}>
          <span className="patient-assessment-record-icon" aria-hidden="true">
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <dt>{label}</dt>
          <span className="patient-assessment-record-separator" aria-hidden="true">:</span>
          <dd>{value ? (key === "status" ? <span className="patient-status-pill">{value}</span> : value) : "Not recorded"}</dd>
        </div>
      ))}
    </dl>
  );
}

const VITAL_SIGN_PRESENTATION = {
  blood_pressure: { label: "Blood\nPressure", unit: "mmHg" },
  temperature: { label: "Temperature", unit: "°C" },
  pulse_rate: { label: "Pulse\nRate", unit: "bpm" },
  respiratory_rate: { label: "Respiratory\nRate", unit: "breaths/min" },
  height_cm: { label: "Height", unit: "cm" },
  weight_kg: { label: "Weight", unit: "kg" },
  bmi: { label: "Body Mass\nIndex (BMI)", unit: "kg/m²" },
  oxygen_saturation: { label: "Oxygen\nSaturation (SpO2)", unit: "%" },
  pain_score: { label: "Pain\nScore", unit: "0–10" },
};

function VitalSignsSection({ definition, records, onViewAll }) {
  const record = getLatestRecord(records, definition.dateField);

  const fields = Object.entries(definition.fields).filter(
    ([key]) => VITAL_SIGN_PRESENTATION[key]
  );

  return (
    <section className="patient-healthinfo-card patient-health-assessment-section">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <Activity size={18} strokeWidth={1.8} />
          </span>
          <h2>{definition.label}</h2>
        </div>
        <button
          type="button"
          className="patient-view-button"
          onClick={onViewAll}
        >
          View All
        </button>
      </div>

      {record ? (
        <div className="patient-table-wrap patient-health-assessment-table-wrap">
          <table className="patient-health-table patient-health-assessment-table">
            <thead>
              <tr>
                {fields.map(([key]) => (
                  <th scope="col" key={key}>
                    {VITAL_SIGN_PRESENTATION[key].label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                {fields.map(([key]) => {
                  const value = record[key];

                  return (
                    <td key={key}>
                      {value !== null &&
                      value !== undefined &&
                      value !== ""
                        ? `${value}${VITAL_SIGN_PRESENTATION[key].unit || ""}`
                        : "--"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No vital signs recorded.
        </div>
      )}
    </section>
  );
}
function AllergyRecordsSection({ definition, records, onViewAll }) {
  const latestRecord = getLatestRecord(records, definition.dateField);
  const fields = Object.entries(definition.fields).filter(([, field]) => field.column || field.primary);

  return (
    <section className="patient-healthinfo-card patient-allergies-section">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <TriangleAlert size={18} strokeWidth={1.8} />
          </span>
          <h2>{definition.label}</h2>
        </div>
        <button type="button" className="patient-view-button" onClick={onViewAll}>
          View All
        </button>
      </div>

      {records.length > 0 ? (
        <>
          <div className="patient-table-wrap patient-allergies-table-wrap">
            <table className="patient-health-table patient-allergies-table">
              <thead>
                <tr>
                  {fields.map(([key, field]) => <th key={key}>{field.label}</th>)}
                  <th>{definition.dateLabel}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.record_id}>
                    {fields.map(([key, field]) => {
                      const value = record[key];
                      const displayValue = field.type === "select" && value
                        ? field.options?.[value] || value
                        : value;
                      return <td key={key}>{displayValue || "--"}</td>;
                    })}
                    <td>{formatRecordDate(record[definition.dateField]) || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="patient-empty-state">No allergies recorded.</div>
      )}
    </section>
  );
}

function HealthAssessmentSection({ definition, records, onViewAll }) {
  const latestRecord = getLatestRecord(records, "created_at");
  const fields = Object.entries(definition.fields).filter(([, field]) => field.column || field.primary);

  return (
    <section className="patient-healthinfo-card patient-health-assessment-section">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <ClipboardList size={18} strokeWidth={1.8} />
          </span>
          <h2>{definition.label}</h2>
        </div>
        <button type="button" className="patient-view-button" onClick={onViewAll}>
          View All
        </button>
      </div>

      {records.length > 0 ? (
        <>
          <div className="patient-table-wrap patient-health-assessment-table-wrap">
            <table className="patient-health-table patient-health-assessment-table">
              <thead>
                <tr>
                  {fields.map(([key, field]) => <th key={key}>{field.label}</th>)}
                  <th>{definition.dateLabel}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.record_id}>
                    {fields.map(([key, field]) => {
                      const value = record[key];
                      const displayValue = field.type === "select" && value
                        ? field.options?.[value] || value
                        : value;
                      return <td key={key}>{displayValue || "--"}</td>;
                    })}
                    <td>{formatRecordDate(record[definition.dateField]) || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="patient-empty-state">No health assessment recorded.</div>
      )}
    </section>
  );
}

function MidwifeNotesSection({ definition, records, onViewAll }) {
  return (
    <section className="patient-healthinfo-card patient-midwife-notes-section patient-health-assessment-section">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <FileText size={18} strokeWidth={1.8} />
          </span>
          <h2>{definition.label}</h2>
        </div>
      </div>

      <button
        type="button"
        className="patient-view-button"
        onClick={onViewAll}
      >
        View All
      </button>

      {records.length > 0 ? (
        <div className="patient-table-wrap patient-midwife-notes-table-wrap">
          <table className="patient-health-table patient-midwife-notes-table">
            <thead>
              <tr>
                <th>Notes</th>
                <th>Recorded By</th>
                <th>Recorded On</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.record_id}>
                  <td className="patient-midwife-notes-text">
                    {record.notes || "--"}
                  </td>
                  <td>
                    {record.created_by_name ||
                      record.created_by ||
                      "--"}
                  </td>
                  <td>
                    {formatRecordDateTime(record.created_at) || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="patient-empty-state">
          No midwife notes recorded.
        </div>
      )}
    </section>
  );
}

function MidwifeNoteCard({ definition, record }) {
  const rawNotes = typeof record.notes === "string" ? record.notes.trim() : "";
  const noteLines = rawNotes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const isBulletList = noteLines.length > 0 && noteLines.every((line) => /^[-*•]\s+/.test(line));
  const consultationDate = formatRecordDate(record[definition.dateField]);
  const recordedBy = record.created_by_name || record.created_by || "Not recorded";
  const recordedAt = formatRecordDateTime(record.created_at);

  return (
    <article className="patient-midwife-note-card">
      <header className="patient-midwife-note-card-header">
        <span className="patient-midwife-note-icon" aria-hidden="true">
          <FileText size={23} strokeWidth={1.8} />
          <Pencil size={12} strokeWidth={2} />
        </span>
        <div className="patient-midwife-note-meta">
          <div>
            <span className="patient-midwife-note-label">Consultation Date</span>
            <span className="patient-midwife-note-value">{consultationDate || "Not recorded"}</span>
          </div>
          <div>
            <span className="patient-midwife-note-label">Recorded By</span>
            <span className="patient-midwife-note-value">{recordedBy}</span>
          </div>
        </div>
      </header>
      <div className="patient-midwife-note-content">
        <h3>Notes:</h3>
        {isBulletList ? (
          <ul>
            {noteLines.map((line, index) => (
              <li key={`${index}-${line}`}>{line.replace(/^[-*•]\s+/, "")}</li>
            ))}
          </ul>
        ) : (
          <p className="patient-midwife-note-plain-text">{rawNotes || "No notes recorded."}</p>
        )}
      </div>
      <footer className="patient-midwife-note-recorded">
        <span className="patient-midwife-note-recorded-date">
          <CalendarDays size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Recorded on: {recordedAt || "Not recorded"}</span>
        </span>
        <span className="patient-midwife-note-footer-label">Showing latest midwife notes</span>
      </footer>
    </article>
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