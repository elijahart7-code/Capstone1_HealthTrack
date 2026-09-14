import { useEffect, useState } from "react";
import { api } from "../../lib/axios";
import { calculateAge } from "../../utils/calculateAge";
import { RECORD_TYPES } from "../../config/recordTypes";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";
import { Badge, EmptyState, Table, Th, Td } from "../../components/ui/Table";
import { ClinicalRecords } from "./ClinicalRecords";

import {
  UserRound,
  HeartPulse,
  ClipboardList,
  FileText,
  BriefcaseMedical,
  TriangleAlert,
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Heart,
  Droplet,
  IdCard,
  Flag,
  User,
  Pencil,
} from "lucide-react";

export function PatientRecord({
  patientId,
  role,
  onBack,
  onPatientUpdated,
}) {
  const isAdmin = role === "admin";

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [section, setSection] = useState("general");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [apptError, setApptError] = useState(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [accountError, setAccountError] = useState(null);
  const [showEditInformation, setShowEditInformation] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError(null);

    try {
      const [patientRes, apptRes] = await Promise.all([
        api.get(`/patients/${patientId}`),
        api.get(`/patients/${patientId}/appointments`),
      ]);

      setPatient(patientRes.data.patient);
      setAppointments(apptRes.data.appointments || []);
    } catch (error) {
      console.error(error);
      setLoadError(
        error?.response?.data?.error ||
          "Could not load this patient record. Check that the server is running and sign in again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function scheduleAppointment() {
    setApptError(null);

    if (!scheduledAt || !reason) {
      setApptError("Date/time and reason are required.");
      return;
    }

    try {
      await api.post(`/patients/${patientId}/appointments`, {
        scheduledAt,
        reason,
        notes,
        status,
      });

      setScheduledAt("");
      setReason("");
      setNotes("");
      setStatus("pending");
      setShowAppointmentForm(false);

      load();
      onPatientUpdated?.();
    } catch (err) {
      setApptError(
        err?.response?.data?.error ||
          "Could not schedule that appointment."
      );
    }
  }

  async function deleteAppointment(appointmentId) {
    if (!confirm("Remove this appointment?")) return;

    await api.delete(`/appointments/${appointmentId}`);

    load();
    onPatientUpdated?.();
  }

  async function createPortalAccount() {
    setAccountError(null);

    if (!portalEmail) {
      setAccountError("Email address is required.");
      return;
    }

    try {
      const { data } = await api.post(
        `/patients/${patientId}/portal-account`,
        {
          email: portalEmail,
        }
      );

      setPatient(data.patient);
      setPortalEmail("");
      setShowAccountForm(false);

      onPatientUpdated?.();
    } catch (err) {
      setAccountError(
        err?.response?.data?.error ||
          "Could not create that account."
      );
    }
  }

  async function deletePatient() {
    if (!confirm("Delete this patient and all of their clinical history? This cannot be undone.")) return;
    setDeleteError(null);
    try {
      await api.delete(`/patients/${patientId}`);
      onPatientUpdated?.();
      onBack();
    } catch (err) {
      setDeleteError(err?.response?.data?.error || "Could not delete this patient.");
    }
  }

  if (loading) {
    return (
      <div className="ht-loading">
        Loading...
      </div>
    );
  }

  if (loadError || !patient) {
    return (
      <div className="ht-loading">
        {loadError || "Patient record not found."}
      </div>
    );
  }

  const sidebarItems = [
    {
      key: "general",
      label: "Patient Information",
      icon: UserRound,
    },
    {
      key: "vital-signs",
      label: "Vital Signs",
      icon: HeartPulse,
      recordType: "vital-signs",
    },
    {
      key: "health-assessment",
      label: "Health Assessment",
      icon: ClipboardList,
      recordType: "health-assessment",
    },
    {
      key: "midwife-notes",
      label: "Midwife Notes",
      icon: FileText,
      recordType: "midwife-notes",
    },
    {
      key: "medical-history",
      label: "Medical Histories",
      icon: BriefcaseMedical,
      recordType: "medical-history",
    },
    {
      key: "allergies",
      label: "Allergies",
      icon: TriangleAlert,
      recordType: "allergies",
    },
  ];

  return (
    <div className="ht-patient-page">

      
      {/* ================= PATIENT HEADER ================= */}
      <section className="ht-patient-header">

        <div className="ht-patient-profile">

          <div className="ht-profile-circle">
            <UserRound size={29} />
          </div>

          <div>
            <h1>{patient.full_name}</h1>
          </div>

        </div>

         <div className="ht-patient-actions">
          <button
            type="button"
            onClick={onBack}
            className="ht-back-button"
          >
            <ArrowLeft size={16} />
            Back to patients
          </button>
        </div>
      </section>
      {deleteError && <div className="ht-login-alert ht-login-alert-error">{deleteError}</div>}
      {/* ================= MAIN CONTENT ================= */}
      <div className="ht-patient-content">

        {/* SIDEBAR */}
        <aside className="ht-patient-sidebar">

          {sidebarItems.map((item) => {
            const Icon = item.icon;

            const active =
              section === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setSection(item.key)
                }
                className={`ht-sidebar-item ${
                  active ? "active" : ""
                }`}
              >

                <span className="ht-sidebar-icon">
                  <Icon size={18} />
                </span>

                <span>
                  {item.label}
                </span>

              </button>
            );
          })}

        </aside>


        {/* ================= RIGHT CONTENT ================= */}
        <main className="ht-patient-main">

          {/* GENERAL / PATIENT INFORMATION */}
          {section === "general" && (
            <div className="grid gap-4">

              <div className="ht-content-card">

                <h2>Patient Information</h2>

                <dl className="ht-detail-grid">

                      {/* ROW 1 */}
            <Detail
                icon={<UserRound size={20} />}
                label="Full Name"
                value={patient.full_name}
            />
            <Detail
                icon={<User size={20} />}
                label="Sex"
                value={
                patient.sex
                ? patient.sex.charAt(0).toUpperCase() +
                  patient.sex.slice(1)
                  : "--"
                }
            />
            <Detail
                icon={<MapPin size={20} />}
                label="Address"
                value={patient.address}
            />
                    {/* ROW 2 */}
            <Detail
                icon={<Calendar size={20} />}
                label="Date of Birth"
                value={
                patient.birthdate
                ? new Date(patient.birthdate).toLocaleDateString(
                  undefined,
               {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
               }
             )
              : "--"
            }
            />
            <Detail
                icon={<UserRound size={20} />}
                label="Age"
                value={`${calculateAge(patient.birthdate)} years old`}
            />
            <Detail
                icon={<Phone size={20} />}
                label="Contact Number"
                value={patient.contact_number}
            />
                {/* ROW 3 */}
            <Detail
                icon={<Heart size={20} />}
                label="Civil Status"
                value={patient.civil_status}
            />
            <Detail
                icon={<Droplet size={20} />}
                label="Blood Type"
                value={patient.blood_type}
            />
            <Detail
                icon={<BriefcaseMedical size={20} />}
                label="Occupation"
                value={patient.occupation}
            />
                {/* ROW 4 */}
            <Detail
                icon={<IdCard size={20} />}
                label="Barangay ID Number"
                value={patient.barangay_id_number}
            />
            <Detail
                icon={<Flag size={20} />}
                label="Nationality"
                value={patient.nationality}
            />
            <Detail
                icon={<MapPin size={20} />}
                label="Place of Birth"
                value={patient.place_of_birth}
            />
                {/* ROW 5 - EMERGENCY INFORMATION */}
            <div className="ht-emergency-row">
            <Detail
                icon={<UserRound size={20} />}
                label="Emergency Contact"
                value={patient.emergency_contact_name}
            />
            <Detail
                icon={<Phone size={20} />}
                label="Emergency Number"
                value={patient.emergency_contact_number}
            />
            <Detail
                icon={<User size={20} />}
                label="Relationship"
                value={patient.emergency_contact_relationship}
            />
            </div>
          </dl>
        </div>
                {/* PORTAL ACCOUNT */}
           <div className="ht-content-card ht-portal-card">
             <div className="ht-card-heading">
                <h2>Patient Portal Account</h2>
                   {!patient.user_id && (isAdmin || role === "health_worker") && (
                  <button
                  onClick={() =>
                  setShowAccountForm((value) => !value)
                }
                className="ht-small-button"
                >
                {showAccountForm
                ? "Cancel"
                : "Create account"}
                </button>
            )}
       </div>
               {patient.user_id ? (
          <div className="ht-portal-info">
                {/* Account Icon */}
          <div className="ht-portal-avatar">
          <UserRound size={46} strokeWidth={1.8} />
          <span className="ht-portal-check">
           ✓
          </span>
          </div>
              {/* Account Details */}
          <div className="ht-portal-details">
          <div className="ht-portal-detail">
          <span>Account Status:</span>
          <span className="ht-account-status">
            Active
          </span>
        </div>

        <div className="ht-portal-detail">
          <span>Email Address:</span>

          <strong>
            {patient.email ||
              patient.portal_email ||
              "--"}
          </strong>
        </div>

        <div className="ht-portal-detail">
          <span>Account Created:</span>

          <strong>
            {patient.account_created_at
              ? new Date(
                  patient.account_created_at
                ).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "--"}
          </strong>
        </div>

      </div>

    </div>

  ) : showAccountForm && (isAdmin || role === "health_worker") ? (

    <div className="ht-form-box">

      {accountError && (
        <div className="ht-login-alert ht-login-alert-error">
          {accountError}
        </div>
      )}

      <Field
        label="Email address"
        required
      >
        <Input
          type="email"
          value={portalEmail}
          onChange={(e) =>
            setPortalEmail(e.target.value)
          }
        />
      </Field>

      <div className="ht-form-buttons">

        <button
          onClick={createPortalAccount}
          className="ht-primary-button"
        >
          Create account
        </button>

        <button
          onClick={() =>
            setShowAccountForm(false)
          }
          className="ht-secondary-button"
        >
          Cancel
        </button>

      </div>

    </div>

  ) : (

    <div className="ht-empty">
      No portal account.
    </div>

  )}

</div>
              {/* APPOINTMENTS */}
              <div className="ht-content-card">

                <div className="ht-card-heading">

                  <h2>Appointments</h2>

                  {isAdmin && (
                    <button
                      onClick={() =>
                        setShowAppointmentForm(
                          (value) => !value
                        )
                      }
                      className="ht-small-button"
                    >
                      {showAppointmentForm
                        ? "Cancel"
                        : "Schedule appointment"}
                    </button>
                  )}

                </div>

                {showAppointmentForm && (
                  <div className="ht-form-box">

                    {apptError && (
                      <div className="ht-login-alert ht-login-alert-error">
                        {apptError}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">

                      <Field
                        label="Date and time"
                        required
                      >
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) =>
                            setScheduledAt(
                              e.target.value
                            )
                          }
                        />
                      </Field>

                      <Field label="Status">
                        <Select
                          value={status}
                          onChange={(e) =>
                            setStatus(
                              e.target.value
                            )
                          }
                        >
                          <option value="pending">
                            Pending
                          </option>

                          <option value="confirmed">
                            Confirmed
                          </option>

                          <option value="completed">
                            Completed
                          </option>

                          <option value="cancelled">
                            Cancelled
                          </option>
                        </Select>
                      </Field>

                    </div>

                    <Field
                      label="Reason"
                      required
                    >
                      <Input
                        value={reason}
                        onChange={(e) =>
                          setReason(e.target.value)
                        }
                        placeholder="e.g. Prenatal check-up"
                      />
                    </Field>

                    <Field label="Notes">
                      <Textarea
                        value={notes}
                        onChange={(e) =>
                          setNotes(e.target.value)
                        }
                      />
                    </Field>

                    <div className="ht-form-buttons">

                      <button
                        onClick={
                          scheduleAppointment
                        }
                        className="ht-primary-button"
                      >
                        Save appointment
                      </button>

                      <button
                        onClick={() =>
                          setShowAppointmentForm(false)
                        }
                        className="ht-secondary-button"
                      >
                        Cancel
                      </button>

                    </div>

                  </div>
                )}

                {appointments.length === 0 ? (
                  <EmptyState>
                    No appointments for this patient.
                  </EmptyState>
                ) : (
                  <Table>

                    <thead>
                      <tr>
                        <Th>Date and time</Th>
                        <Th>Reason</Th>
                        <Th>Status</Th>

                        {isAdmin && (
                          <Th srOnly>
                            Actions
                          </Th>
                        )}
                      </tr>
                    </thead>

                    <tbody>

                      {appointments.map((appointment) => (
                        <tr
                          key={
                            appointment.appointment_id
                          }
                        >

                          <Td>
                            {new Date(
                              appointment.scheduled_at
                            ).toLocaleString()}
                          </Td>

                          <Td>
                            {appointment.reason}
                          </Td>

                          <Td>
                            <Badge>
                              {appointment.status}
                            </Badge>
                          </Td>

                          {isAdmin && (
                            <Td>

                              <button
                                onClick={() =>
                                  deleteAppointment(
                                    appointment.appointment_id
                                  )
                                }
                                className="ht-delete-button"
                              >
                                Remove
                              </button>

                            </Td>
                          )}

                        </tr>
                      ))}

                    </tbody>

                  </Table>
                )}

              </div>

            </div>
          )}


          {/* CLINICAL RECORDS */}
          {section !== "general" && (
            <ClinicalRecords
              patientId={patientId}
              type={
                sidebarItems.find(
                  (item) =>
                    item.key === section
                )?.recordType
              }
              role={role}
            />
          )}

        </main>

      </div>


      {/* ================= DESIGN ================= */}
      <style>{`

        * {
          box-sizing: border-box;
        }

        .ht-patient-page {
          min-height: 100vh;
          background: #f3f8f5;
          color: #18231e;
          font-family: Inter, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding-bottom: 40px;
        }

        /* TOP BAR */

        .ht-topbar {
          height: 72px;
          display: flex;
          align-items: center;
          grid-template-columns: 1fr auto 1fr;
          width: 100%;
          padding: 0 42px;
          boxing-sizing: border-box;
          background: #f8fcfa;
          border-bottom: 1px solid #dce9e2;
        }

        .ht-brand {
          justify-self: start;
        }

        .ht-brand-logo {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3d7c62;
          color: white;
          font-size: 14px;
          font-weight: 800;
        }

        .ht-brand-name {
          color: #225c45;
          font-size: 18px;
          font-weight: 800;
        }

        .ht-main-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ht-main-nav-item {
          border: none;
          background: transparent;
          padding: 10px 18px;
          border-radius: 9px;
          color: #24332c;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .ht-main-nav-item.active {
          background: #e0f0e8;
          color: #245e48;
        }

        .ht-user-area {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: end;
        }

        .ht-user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .ht-user-info strong {
          font-size: 12px;
        }

        .ht-user-info span {
          color: #7a8680;
          font-size: 10px;
        }

        .ht-logout-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border: 1px solid #cbd9d2;
          border-radius: 7px;
          background: white;
          color: #35443d;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* PATIENT HEADER */

        .ht-patient-header {
          margin: 24px 42px 16px;
          min-height: 112px;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #ffffff;
          border: 1px solid #dfeae4;
          border-radius: 13px;
          box-shadow: 0 2px 8px rgba(31, 61, 48, 0.03);
        }

        .ht-patient-profile {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ht-profile-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e3f2eb;
          color: #27634b;
        }

        .ht-patient-profile h1 {
          margin: 0;
          font-size: 21px;
          font-weight: 750;
          color: #17211d;
        }

        .ht-patient-profile p {
          margin: 5px 0 0;
          color: #5f6b65;
          font-size: 12px;
        }

          /* Patient header actions */
.ht-patient-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Edit Information button */
.ht-edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  height: 40px;
  padding: 0 16px;

  border: 1px solid #3f725b;
  border-radius: 7px;

  background: #3f725b;
  color: white;

  font-family: inherit;
  font-size: 12px;
  font-weight: 600;

  cursor: pointer;
  white-space: nowrap;
}

.ht-edit-button:hover {
  background: #315f4b;
  border-color: #315f4b;
}

/* Back button */
.ht-back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  height: 40px;
  padding: 0 16px;

  border: 1px solid #b8c9c0;
  border-radius: 7px;

  background: white;
  color: #40534a;

  font-family: inherit;
  font-size: 12px;
  font-weight: 600;

  cursor: pointer;
  white-space: nowrap;
}

.ht-back-button:hover {
  background: #f4f8f6;
}
        

        /* MAIN */

        .ht-patient-content {
          display: grid;
          grid-template-columns: 235px minmax(0, 1fr);
          gap: 16px;
          margin: 0 42px;
          align-items: start;
        }

        /* SIDEBAR */

        .ht-patient-sidebar {
          background: #ffffff;
          border: 1px solid #dfeae4;
          border-radius: 12px;
          padding: 10px;
          min-height: 430px;
        }

        .ht-sidebar-item {
          width: 100%;
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 8px 12px;
          margin-bottom: 3px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #29352f;
          text-align: left;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .ht-sidebar-item:hover {
          background: #f0f7f3;
        }

        .ht-sidebar-item.active {
          background: #e2f2ea;
          color: #155b41;
        }

        .ht-sidebar-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #4c6258;
        }

        .ht-sidebar-item.active
          .ht-sidebar-icon {
          color: #226b50;
        }

        /* MAIN CARD */

        .ht-patient-main {
          min-width: 0;
        }

        .ht-content-card {
          padding: 20px;
          background: white;
          border: 1px solid #dfeae4;
          border-radius: 11px;
        }

        .ht-content-card h2 {
          margin: 0 0 18px;
          font-size: 16px;
          font-weight: 750;
        }
        /* ================= PORTAL ACCOUNT ================= */

        .ht-portal-card {
          border: 1px solid #9eb7aa;
          border-radius: 11px;
          padding: 20px 28px;
        }
        .ht-portal-card .ht-card-heading {
          margin-bottom: 18px;
        }
        .ht-portal-info {
          display: flex;
          align-items: center;
          gap: 35px;
          min-height: 105px;
        }
         /* Large account icon */
        .ht-portal-avatar {
          position: relative;
          width: 92px;
          height: 92px;
          min-width: 92px;
          border-radius: 50%;
          background: #eaf7f0;
          color: #3f725b;
          display: flex;
          align-items: center;
          justify-content: center;
        }
         /* Green check */
        .ht-portal-check {
          position: absolute;
          right: 2px;
          bottom: 4px;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #24824f;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          border: 3px solid white;
        }
         /* Details */
        .ht-portal-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ht-portal-detail {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }
        .ht-portal-detail > span:first-child {
          width: 135px;
          color: #56645d;
          font-weight: 700;
        }
        .ht-portal-detail strong {
          color: #28352f;
          font-weight: 600;
        }
            /* Active badge */
        .ht-account-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 14px;
          border-radius: 7px;
          background: #e2f5e9;
          color: #277548;
          font-size: 11px;
          font-weight: 700;
        }
        .ht-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .ht-card-heading h2 {
          margin: 0;
        }

        .ht-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px 45px;
        }
        .ht-detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }
        .ht-detail-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eaf7f0;
          color: #3f725b;
          border-radius: 9px;
        }
        .ht-detail-content {
          min-width: 0;
        }
        .ht-detail-grid dt {
          margin-bottom: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #56645d;
        }
        .ht-detail-grid dd {
          margin: 0;
          font-size: 13px;
          color: #28352f;
          line-height: 1.45;
        }
        .ht-emergency-row {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px 45px;
          border-top: 1px solid #dfeae4;
          padding-top: 24px;
        }
        /* BUTTONS */
        .ht-small-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 13px;
          border: 1px solid #9eb7aa;
          border-radius: 7px;
          background: white;
          color: #315846;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ht-primary-button {
          padding: 9px 14px;
          border: none;
          border-radius: 7px;
          background: #3f725b;
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ht-secondary-button {
          padding: 9px 14px;
          border: 1px solid #cbd8d1;
          border-radius: 7px;
          background: white;
          color: #56645d;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .ht-delete-button {
          padding: 7px 10px;
          border: 1px solid #ddb5b5;
          border-radius: 6px;
          background: #fffafa;
          color: #a45151;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        /* FORMS */

        .ht-form-box {
          display: grid;
          gap: 13px;
          margin-bottom: 16px;
          padding: 17px;
          border-radius: 9px;
          background: #f4f8f6;
        }

        .ht-form-buttons {
          display: flex;
          gap: 8px;
        }

        .ht-empty {
          padding: 25px;
          text-align: center;
          border-radius: 8px;
          background: #f8faf9;
          color: #7b8580;
          font-size: 12px;
        }

        .ht-muted {
          color: #78837d;
          font-size: 11px;
        }

        .ht-loading {
          padding: 40px;
          color: #65736c;
          font-family: Inter, sans-serif;
        }

        @media (max-width: 900px) {

          .ht-topbar {
            padding: 0 20px;
          }

          .ht-main-nav {
            display: none;
          }

          .ht-patient-header {
            margin-left: 20px;
            margin-right: 20px;
          }

          .ht-patient-content {
            margin: 0 20px;
            grid-template-columns: 190px minmax(0, 1fr);
          }

        }

        @media (max-width: 700px) {

          .ht-topbar {
            padding: 0 14px;
          }

          .ht-brand-name {
            display: none;
          }

          .ht-user-info {
            display: none;
          }

          .ht-patient-header {
            margin: 14px;
            padding: 15px;
            align-items: flex-start;
            flex-direction: column;
          }

          .ht-patient-content {
            margin: 0 14px;
            grid-template-columns: 1fr;
          }

          .ht-patient-sidebar {
            min-height: auto;
          }

          .ht-sidebar-item {
            min-height: 45px;
          }

          .ht-detail-grid {
            grid-template-columns: 1fr;
          }

        }

      `}</style>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="ht-detail-item">
      <div className="ht-detail-icon">
        {icon}
      </div>

      <div className="ht-detail-content">
        <dt>{label}</dt>
        <dd>{value || "--"}</dd>
      </div>
    </div>
  );
}