import { useEffect, useState } from "react";
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
  Pill,
  Utensils,
  Leaf,
  CircleAlert,
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
  Briefcase,
  IdCard,
  MapPin,
  Phone,
  PhoneCall,
} from "lucide-react";

const SECTION_ICONS = {
  appointments: Calendar,
  "patient-information": User,
  "vital-signs": Activity,
  "midwife-notes": FileText,
  "medical-history": FileText,
  allergies: Activity,
};

const HEALTH_ASSESSMENT_CHILD_SECTIONS = ["vital-signs", "midwife-notes", "allergies"];

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
  const recordTypes = healthInfo.recordTypes || {};
  const records = healthInfo.records || {};
  const appointments = healthInfo.appointments || [];
  const patientName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");
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
            expanded={assessmentExpanded}
            onClick={() => {
              setAssessmentExpanded(true);
              selectSection("health-assessment");
            }}
            onToggle={() => setAssessmentExpanded((expanded) => !expanded)}
          />
          {assessmentExpanded && (
            <div className="patient-sidebar-children">
              <SidebarChild label="Vital Signs" active={section === "vital-signs"} onClick={() => selectSection("vital-signs")} />
              <SidebarChild label="Midwife Notes" active={section === "midwife-notes"} onClick={() => selectSection("midwife-notes")} />
              <SidebarChild label="Allergies" active={section === "allergies"} onClick={() => selectSection("allergies")} />
            </div>
          )}
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
            </div>

            <div className="patient-information-grid">
              <InfoField icon={User} label="Full Name" value={patientName} />
              <InfoField icon={UserRound} label="Sex" value={patient.sex} />
              <InfoField icon={CalendarDays} label="Date of Birth" value={patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : null} />
              <InfoField icon={Clock3} label="Age" value={patient.age != null ? `${patient.age} years old` : null} />
              <InfoField icon={MapPin} label="Address" value={patient.address} />
              <InfoField icon={HeartPulse} label="Civil Status" value={patient.civil_status} />
              <InfoField icon={Droplets} label="Blood Type" value={patient.blood_type} />
              <InfoField icon={Phone} label="Contact Number" value={patient.contact_number} />
              <InfoField icon={Briefcase} label="Occupation" value={patient.occupation} />
              <InfoField icon={UsersRound} label="Emergency Contact" value={patient.emergency_contact_name} />
              <InfoField icon={PhoneCall} label="Emergency Contact Number" value={patient.emergency_contact_number} />
              <InfoField icon={IdCard} label="Barangay ID Number" value={patient.barangay_id_number} />
            </div>
        </section>}

        {section === "patient-information" && <section className="patient-healthinfo-card patient-portal-info-card">
          <div className="patient-portal-info-icon" aria-hidden="true">
            <HeartPulse size={22} strokeWidth={1.8} />
          </div>
          <div className="patient-portal-info-copy">
            <h2>Patient Portal</h2>
            <p>The patient portal allows patients to access their health information and communicate with their healthcare provider.</p>
          </div>
          <button type="button" className="patient-portal-info-button" onClick={() => setSearchParams({ page: "dashboard" })}>
            Go to Patient Portal
            <ArrowRight size={17} strokeWidth={1.9} />
          </button>
        </section>}

        {Object.entries(recordTypes).map(([key, definition]) => section === key && (
          key === "medical-history" ? (
            <MedicalHistorySection
              key={key}
              definition={definition}
              records={records[key] || []}
            />
          ) : (
            <RecordSection
              key={key}
              definition={definition}
              records={records[key] || []}
              onViewAll={() => selectSection(key)}
            />
          )
        ))}
          </>
        )}
      </main>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="patient-info-field">
      <span className="patient-info-label">
        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </span>
      <span className="patient-info-value">{value || "Not provided"}</span>
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
          <span className="patient-sidebar-icon"><Icon size={18} strokeWidth={1.8} /></span>
          <span>{label}</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="patient-sidebar-toggle"
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
          aria-expanded={expanded}
        >
          <ChevronDown className={`patient-sidebar-chevron ${expanded ? "is-expanded" : "is-collapsed"}`} size={16} />
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
      <span className="patient-sidebar-icon"><Icon size={18} strokeWidth={1.8} /></span>
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
  const headerDate = type === "notes"
    ? formatRecordDateTime(record?.created_at)
    : formatRecordDate(record?.[definition.dateField]);

  return (
    <section className={`patient-healthinfo-card patient-latest-card patient-latest-${type}`}>
      <header className="patient-latest-card-header">
        <div className="patient-latest-title">
          <Icon size={22} strokeWidth={2} />
          <h2>{title}</h2>
        </div>
        {record && headerDate && (
          <div className="patient-latest-date">
            <Calendar size={16} strokeWidth={1.8} />
            <span>{type === "assessment" ? "Assessment date:" : "Recorded on:"} {headerDate}</span>
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
  const vitalRows = [
    { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
    { key: "heart_rate", label: "Heart Rate", unit: "bpm" },
    { key: "temperature", label: "Temperature", unit: "°C" },
    { key: "respiratory_rate", label: "Respiratory Rate", unit: "breaths/min" },
    { key: "height_cm", label: "Height", unit: "cm" },
    { key: "weight_kg", label: "Weight", unit: "kg" },
    { key: "bmi", label: "BMI", unit: "kg/m²" },
    { key: "pulse_rate", label: "Pulse Rate", unit: "bpm" },
  ].filter(({ key }) => record?.[key] !== null && record?.[key] !== undefined && record?.[key] !== "");

  return (
    <LatestRecordCard title="Latest Vital Signs" icon={Activity} type="vitals" definition={definition} record={record}>
      {vitalRows.length > 0 ? (
        <div className="patient-table-wrap patient-vital-table-wrap">
          <table className="patient-health-table patient-vital-table">
            <colgroup>
              <col className="patient-vital-measurement-column" />
              <col className="patient-vital-result-column" />
              <col className="patient-vital-unit-column" />
            </colgroup>
            <thead>
              <tr>
                <th>Measurement</th>
                <th>Result</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {vitalRows.map(({ key, label, unit }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{record[key]}</td>
                  <td>{unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="patient-empty-state">No vital signs recorded yet.</div>}
    </LatestRecordCard>
  );
}

function LatestHealthAssessment({ definition, record }) {
  const fields = getRecordFields(definition, record, ["condition", "description", "status", "remarks"]);
  const assessmentDate = record?.[definition.dateField];
  const recordedOn = formatRecordDateTime(record?.created_at);
  const recordedBy = record?.created_by_name || record?.created_by;

  return (
    <LatestRecordCard title="Latest Health Assessment" icon={ClipboardList} type="assessment" definition={definition} record={record}>
      {record ? (
        <AssessmentDetailRows
          fields={fields}
          assessmentDate={assessmentDate}
          recordedOn={recordedOn}
          recordedBy={recordedBy}
        />
      ) : <div className="patient-empty-state">No health assessment recorded yet.</div>}
    </LatestRecordCard>
  );
}

function LatestAllergies({ definition, record }) {
  const fields = getRecordFields(definition, record, Object.keys(definition?.fields || {}));
  const fieldValues = Object.fromEntries(fields.map(({ key, value }) => [key, value]));
  const rows = [
    { key: "medication_allergies", label: "Drug Allergies", icon: Pill, value: fieldValues.medication_allergies },
    { key: "food_allergies", label: "Food Allergies", icon: Utensils, value: fieldValues.food_allergies },
    { key: "environmental_allergies", label: "Environmental Allergies", icon: Leaf, value: fieldValues.environmental_allergies },
    { key: "reaction", label: "Reaction", icon: CircleAlert, value: fieldValues.reaction },
    { key: "remarks", label: "Remarks", icon: MessageSquare, value: fieldValues.remarks },
    { key: "recorded_by", label: "Recorded By", icon: User, value: record?.created_by_name || record?.created_by },
  ];

  return (
    <LatestRecordCard title="Latest Allergies" icon={TriangleAlert} type="allergies" definition={definition} record={record}>
      <AllergyDetailRows rows={rows} />
    </LatestRecordCard>
  );
}

function LatestMidwifeNotes({ definition, record }) {
  const note = record?.notes;
  const noteItems = note
    ? note.split(/\r?\n/).map((item) => item.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean)
    : [];
  const consultationDate = formatRecordDate(record?.[definition.dateField]);
  const recordedBy = record?.created_by_name || record?.created_by;

  return (
    <LatestRecordCard title="Latest Midwife Notes" icon={FileText} type="notes" definition={definition} record={record}>
      <div className="patient-midwife-note-layout">
        <span className="patient-midwife-note-icon" aria-hidden="true">
          <FileText size={21} strokeWidth={1.8} />
        </span>
        <div className="patient-midwife-note-body">
          <div className="patient-midwife-note-meta">
            <div>
              <span className="patient-midwife-note-label">Consultation Date</span>
              <span className="patient-midwife-note-value">{consultationDate || "Not recorded"}</span>
            </div>
            <div>
              <span className="patient-midwife-note-label">Recorded By</span>
              <span className="patient-midwife-note-value">{recordedBy || "Not recorded"}</span>
            </div>
          </div>
          <section className="patient-midwife-note-content" aria-label="Midwife notes">
            <h3>Notes:</h3>
            {noteItems.length > 0 ? (
              <ul>
                {noteItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
              </ul>
            ) : <p>No midwife notes recorded yet.</p>}
          </section>
        </div>
      </div>
    </LatestRecordCard>
  );
}

function AllergyDetailRows({ rows }) {
  return (
    <dl className="patient-allergy-detail-list">
      {rows.map(({ key, label, icon: Icon, value }) => (
        <div className="patient-allergy-detail-row" key={key}>
          <span className="patient-allergy-detail-icon" aria-hidden="true">
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <dt>{label}</dt>
          <span className="patient-allergy-detail-separator" aria-hidden="true">:</span>
          <dd>{value || "Not recorded"}</dd>
        </div>
      ))}
    </dl>
  );
}

function MedicalHistorySection({ definition, records }) {
  const record = records[0] || null;
  const rows = [
    { key: "past_illnesses", label: "Past Illnesses", icon: HeartPulse, emptyValue: "None" },
    { key: "chronic_conditions", label: "Chronic Conditions", icon: Activity, emptyValue: "None" },
    { key: "past_surgeries", label: "Past Surgeries", icon: Scissors, emptyValue: "None" },
    { key: "previous_hospitalizations", label: "Previous Hospitalizations", icon: Hospital, emptyValue: "None" },
    { key: "family_medical_history", label: "Family Medical History", icon: UsersRound, emptyValue: "Not provided" },
    { key: "immunization_status", label: "Immunization Status", icon: Syringe, emptyValue: "Not provided" },
  ];
  const recordedOn = formatRecordDate(record?.[definition.dateField]);
  const recordedBy = record?.created_by_name || record?.created_by;

  return (
    <section className="patient-healthinfo-card patient-medical-history-card">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <FileText size={18} strokeWidth={1.8} />
          </span>
          <h2>Medical Histories</h2>
        </div>
        {records.length > 1 && <span className="patient-card-total">Latest of {records.length}</span>}
      </div>
      <dl className="patient-medical-history-list">
        {rows.map(({ key, label, icon: Icon, emptyValue }) => (
          <div className="patient-medical-history-row" key={key}>
            <span className="patient-medical-history-icon" aria-hidden="true">
              <Icon size={17} strokeWidth={1.8} />
            </span>
            <dt>{label}</dt>
            <span className="patient-medical-history-separator" aria-hidden="true">:</span>
            <dd>{record?.[key] || emptyValue}</dd>
          </div>
        ))}
        <div className="patient-medical-history-row patient-medical-history-meta">
          <span className="patient-medical-history-icon" aria-hidden="true">
            <CalendarDays size={17} strokeWidth={1.8} />
          </span>
          <dt>Recorded on</dt>
          <span className="patient-medical-history-separator" aria-hidden="true">:</span>
          <dd>{recordedOn || "Not provided"}</dd>
        </div>
        <div className="patient-medical-history-row patient-medical-history-meta">
          <span className="patient-medical-history-icon" aria-hidden="true">
            <UserRound size={17} strokeWidth={1.8} />
          </span>
          <dt>Recorded by</dt>
          <span className="patient-medical-history-separator" aria-hidden="true">:</span>
          <dd>{recordedBy || "Not provided"}</dd>
        </div>
      </dl>
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