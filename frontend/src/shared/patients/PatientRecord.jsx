import { AppointmentWorkspace } from "./AppointmentWorkspace";
import { useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/axios";
import { calculateAge } from "../../utils/calculateAge";
import { Field, Input } from "../../components/ui/Input";

import {
  UserRound,
  BriefcaseMedical,
  ClipboardList,
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Heart,
  Droplet,
  IdCard,
  Flag,
  User,
  ArchiveRestore,
  FileText,
  Info,
  ShieldPlus,
} from "lucide-react";


export function PatientRecord({
  patientId,
  role,
  onBack,
  onPatientUpdated,
}) {
  const isAdmin = role === "admin";
  const canManagePortalAccount = role === "health_worker";
  const [searchParams] = useSearchParams();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [section, setSection] = useState(searchParams.get("appointmentId") ? "appointments" : "general");
  useEffect(() => { if (searchParams.get("appointmentId")) setSection("appointments"); }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [portalEmail, setPortalEmail] = useState("");
  const [isClosingAccountForm, setIsClosingAccountForm] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [correctedEmail, setCorrectedEmail] = useState("");
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [isClosingResendConfirm, setIsClosingResendConfirm] = useState(false);
  const [isClosingEmailForm, setIsClosingEmailForm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const resendConfirmCloseTimer = useRef(null);
  const emailFormCloseTimer = useRef(null);
  const accountFormCloseTimer = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(resendConfirmCloseTimer.current);
    window.clearTimeout(emailFormCloseTimer.current);
    window.clearTimeout(accountFormCloseTimer.current);
  }, []);

  function closeAccountForm(force = false) {
    if ((accountBusy && !force) || isClosingAccountForm) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingAccountForm(true);
    accountFormCloseTimer.current = window.setTimeout(() => {
      setShowAccountForm(false);
      setIsClosingAccountForm(false);
      setPortalEmail("");
      setAccountError(null);
    }, reduceMotion ? 0 : 220);
  }

  function closeResendConfirm(force = false) {
    if ((accountBusy && !force) || isClosingResendConfirm) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingResendConfirm(true);
    resendConfirmCloseTimer.current = window.setTimeout(() => {
      setShowResendConfirm(false);
      setIsClosingResendConfirm(false);
    }, reduceMotion ? 0 : 220);
  }

  function closeEmailForm(force = false) {
    if ((accountBusy && !force) || isClosingEmailForm) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingEmailForm(true);
    emailFormCloseTimer.current = window.setTimeout(() => {
      setShowEmailForm(false);
      setIsClosingEmailForm(false);
      setCorrectedEmail("");
      setAccountError(null);
    }, reduceMotion ? 0 : 220);
  }

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

  async function createPortalAccount(event) {
    event.preventDefault();
    setAccountError(null);
    setAccountMessage("");

    if (!portalEmail) {
      setAccountError("Email address is required.");
      return;
    }

    setAccountBusy(true);
    try {
      const { data } = await api.post(
        `/patients/${patientId}/portal-account`,
        {
          email: portalEmail,
        }
      );

      setPatient(data.patient);
      closeAccountForm(true);
      setAccountMessage(data.verification?.message || data.message);

      onPatientUpdated?.();
    } catch (err) {
      setAccountError(
        err?.response?.data?.error ||
          "Could not create that account."
      );
    } finally { setAccountBusy(false); }
  }

  async function resendSetupEmail() {
    setAccountError(null); setAccountMessage(""); setAccountBusy(true);
    try {
      const { data } = await api.post("/auth/initiate", { email: patient.email });
      setAccountMessage(data.message);
      closeResendConfirm(true);
    } catch (err) {
      setAccountError(err?.response?.data?.error || "Could not send the setup email.");
    } finally { setAccountBusy(false); }
  }

  async function changePendingEmail(event) {
    event.preventDefault();
    setAccountError(null); setAccountMessage(""); setAccountBusy(true);
    try {
      const { data } = await api.patch(`/patients/${patientId}/portal-account/email`, {
        email: correctedEmail, current_email: patient.email,
      });
      setPatient(data.patient);
      closeEmailForm(true);
      setAccountMessage(data.verification?.message || data.message);
      onPatientUpdated?.();
    } catch (err) {
      setAccountError(err?.response?.data?.error || "Could not change the portal email.");
    } finally { setAccountBusy(false); }
  }

  async function restorePatient() {
    if (!confirm("Restore this patient? Their record will return to the active patient list and become available for updates again.")) return;
    setDeleteError(null);
    try {
      await api.post(`/patients/${patientId}/restore`);
      onPatientUpdated?.();
      onBack();
    } catch (err) {
      setDeleteError(err?.response?.data?.error || "Could not restore this patient.");
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
    { key: "general", label: "Patient Information", icon: UserRound },
    { key: "appointments", label: "Medical Records", icon: ClipboardList },
  ];

  return (
    <div className="ht-patient-page">


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
          {isAdmin && patient.archived_at && (
            <button
              type="button"
              onClick={restorePatient}
              className="ht-delete-patient-button"
            >
              <ArchiveRestore size={16} />
              Restore Patient
            </button>
          )}
        </div>
      </section>
      {deleteError && <div className="ht-login-alert ht-login-alert-error">{deleteError}</div>}
      <div className="ht-patient-content">

        <aside className="ht-patient-sidebar">

          {sidebarItems.map((item) => {
            const Icon = item.icon;

            const active =
              section === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSection(item.key);
                }}
                className={`ht-sidebar-item ${active ? "active" : ""}`}
              >

                <span className="ht-sidebar-icon">
                  <Icon size={30} />
                </span>

                <span>
                  {item.label}
                </span>

              </button>
            );
          })}

        </aside>


        <main className="ht-patient-main">

          {section === "appointments" && <AppointmentWorkspace patientId={patientId} appointments={appointments} role={role} onSaved={async () => { const {data} = await api.get(`/patients/${patientId}/appointments`); setAppointments(data.appointments || []); onPatientUpdated?.(); }} />}

          {section === "general" && (
            <div className="grid gap-4">

              <div className="ht-content-card">

                <div className="ht-card-heading">
                  <h2 className="ht-patient-section-heading">
                    <span className="ht-section-heading-icon ht-section-heading-icon-general" aria-hidden="true">
                      <FileText className="ht-section-heading-icon-main" size={25} />
                      <Info className="ht-section-heading-icon-badge" size={15} />
                    </span>
                    General Information
                  </h2>
                </div>

                <dl className="ht-detail-grid">

            <Detail
                icon={<UserRound size={30} />}
                label="Full Name"
                value={patient.full_name}
            />
            <Detail
                icon={<User size={30} />}
                label="Sex"
                value={
                patient.sex
                ? patient.sex.charAt(0).toUpperCase() +
                  patient.sex.slice(1)
                  : "--"
                }
            />
            <Detail
                icon={<MapPin size={30} />}
                label="Address"
                value={patient.address}
            />
            <Detail
                icon={<Calendar size={30} />}
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
                icon={<UserRound size={30} />}
                label="Age"
                value={`${calculateAge(patient.birthdate)} years old`}
            />
            <Detail
                icon={<Phone size={30} />}
                label="Contact Number"
                value={patient.contact_number}
            />
            <Detail
                icon={<Heart size={30} />}
                label="Civil Status"
                value={patient.civil_status}
            />
            <Detail
                icon={<Droplet size={30} />}
                label="Blood Type"
                value={patient.blood_type}
            />
            <Detail
                icon={<BriefcaseMedical size={30} />}
                label="Occupation"
                value={patient.occupation}
            />
            <Detail
                icon={<IdCard size={30} />}
                label="Barangay ID Number"
                value={patient.barangay_id_number}
            />
            <Detail
                icon={<Flag size={30} />}
                label="Nationality"
                value={patient.nationality}
            />
            <Detail
                icon={<MapPin size={30} />}
                label="Place of Birth"
                value={`${patient.place_of_birth || "--"}${patient.place_of_birth_data?.verified === false ? " (unverified location)" : ""}`}
            />
            <div className="ht-emergency-row">
            <Detail
                icon={<UserRound size={30} />}
                label="Emergency Contact"
                value={patient.emergency_contact_name}
            />
            <Detail
                icon={<Phone size={30} />}
                label="Emergency Number"
                value={patient.emergency_contact_number}
            />
            <Detail
                icon={<User size={30} />}
                label="Relationship"
                value={patient.emergency_contact_relationship}
            />
            </div>
          </dl>
        </div>
           <div className="ht-content-card ht-portal-card">
             <div className="ht-card-heading">
                <h2 className="ht-patient-section-heading">
                  <span className="ht-section-heading-icon ht-section-heading-icon-portal" aria-hidden="true">
                    <UserRound className="ht-section-heading-icon-main" size={23} />
                    <ShieldPlus className="ht-section-heading-icon-badge" size={18} />
                  </span>
                  Patient Portal Account
                </h2>
                   {!patient.user_id && role === "health_worker" && (
                  <button
                  onClick={() => {
                    if (showAccountForm) {
                      closeAccountForm();
                    } else {
                      window.clearTimeout(accountFormCloseTimer.current);
                      setIsClosingAccountForm(false);
                      setPortalEmail("");
                      setAccountError(null);
                      setAccountMessage("");
                      setShowAccountForm(true);
                    }
                  }}
                className="ht-small-button ht-create-account-button"
                >
                {showAccountForm
                ? "Cancel"
                : "Create account"}
                </button>
            )}
       </div>
       {accountError && !showAccountForm && !showEmailForm && !showResendConfirm && <div className="ht-login-alert ht-login-alert-error" role="alert">{accountError}</div>}
       {accountMessage && !showAccountForm && !showEmailForm && !showResendConfirm && <div className="ht-login-alert" role="status">{accountMessage}</div>}
               {patient.user_id || role === "health_worker" ? (
          <div className="ht-portal-info">
          <div className="ht-portal-avatar">
          <UserRound size={46} strokeWidth={1.8} />
          {patient.user_id && <span className="ht-portal-check">
           ✓
          </span>}
          </div>
          <div className="ht-portal-details">
          <div className={`ht-portal-detail ht-portal-account-detail ${patient.user_id && !patient.is_verified && canManagePortalAccount ? "has-actions" : ""}`}>
          <div className="ht-portal-account-labels">
            <span>Account Status:</span>
            {patient.user_id && !patient.is_verified && canManagePortalAccount && (
              <span>Account Setup:</span>
            )}
          </div>
          <div className="ht-portal-account-controls">
            <span className={`ht-account-status ${!patient.user_id ? "inactive" : patient.is_verified ? "active" : "pending"}`}>
              {!patient.user_id ? "Inactive" : patient.is_verified ? "Active" : "Pending Email"}
            </span>
            {patient.user_id && !patient.is_verified && canManagePortalAccount && (
              <div className="ht-account-actions">
              <button
                type="button"
                className="ht-small-button ht-portal-action-mint-button"
                disabled={accountBusy || !patient.email}
                onClick={() => {
                  window.clearTimeout(resendConfirmCloseTimer.current);
                  setIsClosingResendConfirm(false);
                  setAccountError(null);
                  setAccountMessage("");
                  setShowResendConfirm(true);
                }}
              >
                {accountBusy ? "Sending..." : "Resend Email"}
              </button>
              <button
                type="button"
                className="ht-small-button ht-portal-action-mint-button"
                disabled={accountBusy}
                onClick={() => {
                  window.clearTimeout(emailFormCloseTimer.current);
                  setIsClosingEmailForm(false);
                  setCorrectedEmail(patient.email || "");
                  setAccountError(null);
                  setAccountMessage("");
                  setShowEmailForm(true);
                }}
              >
                Change Email
              </button>
              </div>
            )}
          </div>
        </div>

        <div className="ht-portal-detail">
          <span>Email Address:</span>

          <strong>
            {patient.user_id ? patient.email ||
              patient.portal_email ||
              "---------------" : "---------------"}
          </strong>
        </div>

        <div className="ht-portal-detail">
          <span>Patient Registered:</span>

          <strong>
            {patient.patient_created_at || patient.created_at
              ? new Date(
                  patient.patient_created_at || patient.created_at
                ).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "---------------"}
          </strong>
        </div>

        <div className="ht-portal-detail">
          <span>Account Created:</span>

          <strong>
            {patient.account_activated_at
              ? new Date(
                  patient.account_activated_at
                ).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : patient.is_verified
                ? "--"
                : "Not Yet Activated"}
          </strong>
        </div>

      </div>

      {showResendConfirm && (
        <div
          className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingResendConfirm ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeResendConfirm();
            }
          }}
        >
          <section
            aria-labelledby="resend-confirm-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingResendConfirm ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="resend-confirm-title">Resend Setup Email?</h2>
            <p className="ht-resend-confirm-message">
              Send a new confirmation email to {patient.email}?
            </p>
            {accountError && (
              <p className="ht-confirm-error" role="alert">
                {accountError}
              </p>
            )}
            <div className="ht-confirm-actions ht-archive-confirm-actions">
              <button
                className="ht-confirm-submit ht-account-confirm-submit"
                disabled={accountBusy}
                onClick={resendSetupEmail}
                type="button"
              >
                {accountBusy ? "Sending..." : "Resend"}
              </button>
              <button
                className="ht-confirm-cancel ht-account-confirm-cancel"
                disabled={accountBusy}
                onClick={() => closeResendConfirm()}
                type="button"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {showEmailForm && !patient.is_verified && canManagePortalAccount && (
        <div
          className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingEmailForm ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !accountBusy) {
              closeEmailForm();
            }
          }}
        >
          <section
            aria-labelledby="change-email-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingEmailForm ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="change-email-title">Change Portal Email?</h2>
            <p className="ht-resend-confirm-message">
              The previous confirmation link will stop working. A new link will be sent to the corrected address.
            </p>
            {accountError && (
              <p className="ht-confirm-error" role="alert">
                {accountError}
              </p>
            )}
            <form onSubmit={changePendingEmail} className="ht-change-email-form">
              <Field label="New email address" required>
                <Input
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="off"
                  value={correctedEmail}
                  disabled={accountBusy}
                  onChange={(event) => setCorrectedEmail(event.target.value)}
                />
              </Field>
              <div className="ht-confirm-actions ht-archive-confirm-actions">
                <button
                  className="ht-confirm-submit ht-account-confirm-submit"
                  disabled={accountBusy}
                  type="submit"
                >
                  {accountBusy ? "Saving..." : "Save & Send"}
                </button>
                <button
                  className="ht-confirm-cancel ht-account-confirm-cancel"
                  disabled={accountBusy}
                  onClick={() => closeEmailForm()}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

    </div>

  ) : (
    <>
      {isAdmin ? (
        <div className="ht-portal-unavailable">
          <div className="ht-portal-detail">
            <span>Account Status:</span>
            <span className="ht-account-status inactive">Inactive</span>
          </div>
          <div className="ht-portal-detail">
            <span>Email Address:</span>
            <strong>----------</strong>
          </div>
          <div className="ht-portal-detail">
            <span>Patient Registered:</span>
            <strong>{patient.patient_created_at || patient.created_at ? new Date(patient.patient_created_at || patient.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "----------"}</strong>
          </div>
          <div className="ht-portal-detail">
            <span>Account Created:</span>
            <strong>Not Yet Activated</strong>
          </div>
          <p>Please coordinate with the Health Worker as soon as possible to create your account. Thankyou!</p>
        </div>
      ) : (
        <div className="ht-empty">No portal account.</div>
      )}

    </>
  )}

  {showAccountForm && role === "health_worker" && (
    <div
      className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingAccountForm ? "is-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeAccountForm();
        }
      }}
    >
      <section
        aria-labelledby="create-account-title"
        aria-modal="true"
        className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosingAccountForm ? "is-closing" : ""}`}
        role="dialog"
      >
        <h2 id="create-account-title">Create Patient Portal Account</h2>
        <p className="ht-resend-confirm-message">
          The patient will receive a confirmation link to choose their password. The link expires after 15 minutes.
        </p>
        {accountError && (
          <p className="ht-confirm-error" role="alert">{accountError}</p>
        )}
        <form onSubmit={createPortalAccount} className="ht-change-email-form">
          <Field label="Email address" required>
            <Input
              type="email"
              required
              maxLength={255}
              autoComplete="off"
              value={portalEmail}
              disabled={accountBusy}
              onChange={(event) => setPortalEmail(event.target.value)}
            />
          </Field>
          <div className="ht-confirm-actions ht-archive-confirm-actions">
            <button
              className="ht-confirm-submit ht-account-confirm-submit"
              disabled={accountBusy}
              type="submit"
            >
              {accountBusy ? "Creating..." : "Create Account"}
            </button>
            <button
              className="ht-confirm-cancel ht-account-confirm-cancel"
              disabled={accountBusy}
              onClick={() => closeAccountForm()}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )}

</div>
            </div>
          )}



        </main>

      </div>


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


        .ht-patient-header {
          margin: 24px 42px 16px;
          min-height: 112px;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #ffffff;
          border: 1px solid #000;
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
          font-size: 25px;
          font-weight: 750;
          color: #17211d;
        }

        .ht-patient-profile p {
          margin: 5px 0 0;
          color: #5f6b65;
          font-size: 12px;
        }

.ht-patient-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ht-archive-action-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.ht-archive-action-label {
  color: #8a6a39;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.ht-edit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  width: 180px;
  height: 42px;
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

.ht-back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  width: 180px;
  height: 42px;
  padding: 0 16px;

  border: 1px solid #c0e2d1;
  border-radius: 7px;

  background: #c0e2d1;
  color: #000;

  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
  white-space: nowrap;
}

.ht-back-button:hover {
  background: #b4dfcb;
  border-color: #b4dfcb;
}



        .ht-patient-content {
          display: grid;
          grid-template-columns: 235px minmax(0, 1fr);
          gap: 16px;
          margin: 0 42px;
          align-items: start;
        }


        .ht-patient-sidebar {
          background: #ffffff;
          border: 1px solid #000;
          border-radius: 12px;
          padding: 10px;
        }

        .ht-patient-sidebar-export {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }

        .ht-sidebar-item {
          width: 100%;
          min-height: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          margin-bottom: 4px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #29352f;
          text-align: left;
          font-size: 14px;
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
          width: 34px;
          height: 34px;
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


        .ht-patient-main {
          min-width: 0;
        }

        .ht-content-card {
          padding: 20px;
          background: white;
          border: 1px solid #dfeae4;
          border-radius: 11px;
        }

        .ht-patient-main .ht-content-card {
          border-color: #000;
        }

        .ht-content-card h2 {
          margin: 0 0 18px;
          font-size: 18px;
          font-weight: 950;
        }

        .ht-overview-header {
          margin: 0 auto 14px;
          text-align: center;
        }

        .ht-overview-header h2 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
          color: #000000;
        }

        .ht-overview-header p {
          margin: 5px 0 0;
          color: #000000;
          font-size: 13px;
        }

        .ht-overview-stack {
          display: grid;
          gap: 12px;
        }

        .ht-overview-card {
          overflow: hidden;
          background: #fff;
          border: 1px solid #dce8e1;
          border-radius: 9px;
        }

        .ht-overview-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: #e2f2ea;
          color: #235c43;
        }

        .ht-overview-card-heading h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 14px;
        }

        .ht-overview-card-heading span {
          color: #596d61;
          font-size: 14px;
        }

        .ht-overview-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .ht-overview-table th,
        .ht-overview-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e4ece7;
          text-align: left;
          vertical-align: top;
          font-size: 14px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .ht-overview-table th {
          width: 36%;
          color: #46574e;
          font-weight: 700;
        }

        .ht-overview-table tr:last-child th,
        .ht-overview-table tr:last-child td {
          border-bottom: 0;
        }

        .ht-overview-empty {
          padding: 16px;
          color: #68766f;
          font-size: 13px;
        }

        .ht-overview-notes {
          margin: 0;
          padding: 13px 16px;
          color: #29352f;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .ht-portal-card {
          width: 100%;
          border: 1px solid #DDF3EA;
          border-radius: 14px;
          padding: 22px 26px;
          background: #FFFFFF;
          box-shadow: 0 4px 16px rgba(7, 59, 42, 0.045);
        }
        .ht-portal-card .ht-card-heading {
          margin-bottom: 20px;
        }
        .ht-portal-card .ht-card-heading h2 {
          color: #073B2A;
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 950;
        }
        .ht-portal-info {
          display: grid;
          grid-template-columns: 190px minmax(0, 1fr);
          align-items: center;
          gap: 18px;
          min-height: 150px;
        }
        .ht-portal-avatar {
          position: relative;
          width: 96px;
          height: 96px;
          min-width: 96px;
          justify-self: center;
          border-radius: 0;
          background: #FFFFFF;
          color: #0F513F;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ht-portal-check {
          position: absolute;
          right: 2px;
          bottom: 4px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #0F513F;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          border: 3px solid #FFFFFF;
        }
        .ht-portal-details {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0;
          min-width: 0;
        }
        .ht-portal-detail {
          display: grid;
          grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
          align-items: center;
          gap: 18px;
          min-height: 50px;
          font-size: 1rem;
        }
        .ht-portal-detail > span:first-child {
          color: #073B2A;
          font-weight: 700;
        }
        .ht-portal-detail strong {
          min-width: 0;
          color: #073B2A;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .ht-portal-unavailable {
          width: min(100%, 840px);
          margin: 0 auto;
        }
        .ht-portal-unavailable > p {
          margin: 1.25rem 0 0;
          color: #b2453e;
          font-size: 1rem;
          line-height: 1.5;
          text-align: center;
        }
        .ht-portal-unavailable .ht-account-status {
          justify-self: start;
          width: fit-content;
        }
        .ht-portal-account-labels,
        .ht-portal-account-controls {
          display: grid;
          grid-template-rows: 42px;
          align-items: center;
        }
        .ht-portal-account-detail.has-actions .ht-portal-account-labels,
        .ht-portal-account-detail.has-actions .ht-portal-account-controls {
          grid-template-rows: 42px minmax(50px, auto);
        }
        .ht-portal-account-labels {
          color: #073B2A;
          font-weight: 700;
        }
        .ht-portal-account-controls {
          width: max-content;
          max-width: 100%;
        }
        .ht-portal-account-controls > .ht-account-status {
          justify-self: center;
        }
        .ht-account-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          max-width: 100%;
        }
        .ht-account-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 96px;
          min-height: 32px;
          padding: 0.35rem 0.75rem;
          border: 1px solid transparent;
          border-radius: 999px;
          background: #0f766e;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .ht-account-status.active {
          background: #0f766e;
          color: #fff;
        }

        .ht-account-status.pending {
          background: #8a6500;
          color: #fff;
        }
        .ht-account-status.inactive {
          background: #b83b3b;
          color: #fff;
        }
        .ht-change-email-form {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
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
          grid-template-columns: repeat(3, minmax(220px, 1fr));
          gap: 22px 30px;
        }
        .ht-detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
          width: 100%;
          min-height: 64px;
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
          width: 100%;
          max-width: 220px;
        }
        .ht-detail-grid dt {
          margin-bottom: 5px;
          font-size: 14px;
          font-weight: 700;
          color: #56645d;
          line-height: 1.4;
        }
        .ht-detail-grid dd {
          margin: 0;
          font-size: 15px;
          color: #28352f;
          line-height: 1.5;
          word-break: break-word;
        }
        .ht-emergency-row {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(220px, 1fr));
          gap: 22px 30px;
          border-top: 1px solid #dfeae4;
          padding-top: 24px;
        }

        .ht-delete-patient-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  width: 180px;
  height: 42px;
  padding: 0 16px;

  border: 1px solid #e4b26b;
  border-radius: 8px;

  background: #fff7ed;
  color: #b86d16;

  font-family: inherit;
  font-size: 13px;
  font-weight: 700;

  cursor: pointer;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(184, 109, 22, 0.04);
}

.ht-delete-patient-button:hover {
  background: #fff0dc;
  border-color: #d9993a;
}


        .ht-form-box {
          display: grid;
          gap: 13px;
          margin-bottom: 16px;
          padding: 17px;
          border-radius: 9px;
          background: #f4f8f6;
        }



        .ht-date-time-controls {
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid rgba(15, 107, 95, 0.18);
          border-radius: 10px;
          background: rgba(248, 251, 249, 0.7);
        }

        .ht-date-time-controls .ht-input {
          min-width: 0;
          flex: 1;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .ht-date-time-controls:focus-within {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px rgba(15, 107, 95, 0.1);
        }

        .ht-date-time-ok {
          flex: 0 0 auto;
          align-self: stretch;
          border: 0;
          border-left: 1px solid rgba(15, 107, 95, 0.18);
          border-radius: 0;
          background: transparent;
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

          .ht-portal-card {
            padding: 18px;
          }

          .ht-portal-info {
            grid-template-columns: 1fr;
            justify-items: center;
            gap: 18px;
            padding-top: 8px;
          }

          .ht-portal-details {
            width: 100%;
          }

          .ht-portal-detail {
            grid-template-columns: minmax(115px, 0.8fr) minmax(0, 1.2fr);
            gap: 12px;
            min-height: 44px;
            font-size: 0.82rem;
          }

          .ht-portal-unavailable {
            width: 100%;
          }

          .ht-portal-unavailable > p {
            font-size: 0.9rem;
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
