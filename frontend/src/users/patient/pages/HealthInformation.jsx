import { useState } from "react";
import { Home, Calendar, User, Activity, Lock, HelpCircle, FileText } from "lucide-react";

const SECTION_ICONS = {
  appointments: Calendar,
  "patient-information": User,
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
  const [section, setSection] = useState("appointments");

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

  const navItems = [
    { key: "appointments", label: "Appointments" },
    { key: "patient-information", label: "Patient Information" },
    ...Object.entries(recordTypes).map(([key, def]) => ({ key, label: def.label })),
  ];

  return (
    <div className="patient-healthinfo-page">
      <aside className="patient-healthinfo-sidebar">
        <nav className="patient-healthinfo-nav" aria-label="Health information navigation">
          <button className="patient-sidebar-item">
            <span className="patient-sidebar-icon">
              <Home size={18} strokeWidth={1.8} />
            </span>
            <span>Overview</span>
          </button>

          <div className="patient-sidebar-label">MY HEALTH INFORMATION</div>

          {navItems.map((item) => {
            const Icon = SECTION_ICONS[item.key] || FileText;
            return (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`patient-sidebar-item ${section === item.key ? "is-active" : ""}`}
              >
                <span className="patient-sidebar-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="patient-help-card">
          <div className="patient-help-icon">
            <HelpCircle size={24} strokeWidth={1.8} />
          </div>
          <h3>Need help?</h3>
          <p>Contact your admin or health worker for assistance.</p>
        </div>
      </aside>

      <main className="patient-healthinfo-main">
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

        {section === "appointments" && (
          <section className="patient-healthinfo-card">
            <div className="patient-card-header">
              <div className="patient-card-title">
                <span className="patient-panel-icon patient-panel-icon-small">
                  <Calendar size={18} strokeWidth={1.8} />
                </span>
                <h2>Appointments</h2>
              </div>
              <span className="patient-card-total">{appointments.length} total</span>
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
          </section>
        )}

        {section === "patient-information" && (
          <section className="patient-healthinfo-card">
            <div className="patient-card-header">
              <div className="patient-card-title">
                <span className="patient-panel-icon patient-panel-icon-small">
                  <User size={18} strokeWidth={1.8} />
                </span>
                <h2>Patient Information</h2>
              </div>
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
          </section>
        )}

        {Object.entries(recordTypes).map(
          ([key, definition]) =>
            section === key && (
              <RecordSection key={key} definition={definition} records={records[key]} />
            )
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

function RecordSection({ definition, records }) {
  const columnFields = Object.entries(definition.fields).filter(([, f]) => f.column || f.primary);

  return (
    <section className="patient-healthinfo-card">
      <div className="patient-card-header">
        <div className="patient-card-title">
          <span className="patient-panel-icon patient-panel-icon-small">
            <FileText size={18} strokeWidth={1.8} />
          </span>
          <h2>{definition.label}</h2>
        </div>
        <span className="patient-card-total">{records.length} total</span>
      </div>

      {records.length === 0 ? (
        <div className="patient-empty-state">No {definition.label.toLowerCase()} recorded.</div>
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