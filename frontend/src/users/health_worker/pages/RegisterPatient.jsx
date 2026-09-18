import { useState } from "react";
import { useSearchParams } from "react-router";
import { User, MapPin, PhoneCall } from "lucide-react";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Field, Input, Textarea } from "../../../components/ui/Input";

/**
 * Registers a patient and creates their portal login from the required email.
 */
export function RegisterPatient({ loadData, onRegistered }) {
  const [, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    sex: "",
    birthdate: "",
    age: "",
    civil_status: "",
    blood_type: "",
    occupation: "",
    barangay_id_number: "",
    contact_number: "",
    address: "",
    nationality: "",
    place_of_birth: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    emergency_contact_relationship: "",
    portal_email: "",
  });
  const [error, setError] = useState(null);
  const [portalEmailError, setPortalEmailError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendLoginCredentials, setSendLoginCredentials] = useState(true);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setPortalEmailError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
      };

      const { data } = await api.post("/patients", payload);

      await loadData();
      onRegistered(data.patient.patient_id);
    } catch (err) {
      const message = err?.response?.data?.error || "Could not register this patient.";
      if (message.toLowerCase().includes("email")) {
        setPortalEmailError(message);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Register Patient" subtitle="Add a new patient to the Barangay Health Center of Mambog I.">
        <button onClick={() => setSearchParams({ page: "patients" })} className="ht-button ht-button-muted">
          Back to patients
        </button>
      </PageHeader>

      {error && <div className="ht-login-alert ht-login-alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="ht-register-form">
        <div className="ht-panel ht-form-panel">
          <h2>
            <span className="ht-section-icon" aria-hidden="true">
              <User size={16} strokeWidth={1.8} />
            </span>
            Personal Information
          </h2>
          <div className="ht-form-grid ht-form-grid-3">
            <Field label="First Name" required>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Enter first name" />
            </Field>

            <Field label="Middle Name">
              <Input value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} placeholder="Enter middle name" />
            </Field>

            <Field label="Last Name" required>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Enter last name" />
            </Field>

            <Field label="Sex" required>
              <Input value={form.sex} onChange={(e) => set("sex", e.target.value)} placeholder="Enter sex" />
            </Field>

            <Field label="Date of Birth" required>
              <Input
                type="date"
                value={form.birthdate}
                onChange={(e) => set("birthdate", e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </Field>

            <Field label="Age" required>
              <Input value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="Enter age" />
            </Field>

            <Field label="Civil Status" required>
              <Input value={form.civil_status} onChange={(e) => set("civil_status", e.target.value)} placeholder="Enter civil status" />
            </Field>

            <Field label="Blood Type" required>
              <Input value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} placeholder="Enter blood type" />
            </Field>

            <Field label="Occupation" required>
              <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Enter occupation" />
            </Field>

            <Field label="Contact Number" required>
              <Input value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)} placeholder="Enter contact number" />
            </Field>

            <Field label="Barangay ID Number" required>
              <Input value={form.barangay_id_number} onChange={(e) => set("barangay_id_number", e.target.value)} placeholder="Enter barangay ID number" />
            </Field>

            <Field label="Nationality">
              <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="Enter nationality" />
            </Field>

            <Field label="Place of Birth">
              <Input value={form.place_of_birth} onChange={(e) => set("place_of_birth", e.target.value)} placeholder="Enter place of birth" />
            </Field>
          </div>
        </div>

        <div className="ht-panel ht-form-panel">
          <h2>
            <span className="ht-section-icon" aria-hidden="true">
              <MapPin size={16} strokeWidth={1.8} />
            </span>
            Complete Address
          </h2>
          <Field label="Complete Address" required>
            <Textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
            />
          </Field>
        </div>

        <div className="ht-panel ht-form-panel">
          <h2>
            <span className="ht-section-icon" aria-hidden="true">
              <PhoneCall size={16} strokeWidth={1.8} />
            </span>
            Emergency Contacts
          </h2>
          <div className="ht-form-grid ht-form-grid-3">
            <Field label="Emergency Contact Name" required>
              <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} placeholder="Enter emergency contact name" />
            </Field>
            <Field label="Emergency Contact Number" required>
              <Input value={form.emergency_contact_number} onChange={(e) => set("emergency_contact_number", e.target.value)} placeholder="Enter emergency contact number" />
            </Field>
            <Field label="Relationship" required>
              <Input value={form.emergency_contact_relationship} onChange={(e) => set("emergency_contact_relationship", e.target.value)} placeholder="Enter relationship" />
            </Field>
          </div>
        </div>

        <div className="ht-panel ht-form-panel ht-portal-panel">
          <h2 className="ht-panel-title-row">
            <span className="ht-section-title-wrap">
              <span className="ht-section-icon" aria-hidden="true">
                <User size={16} strokeWidth={1.8} />
              </span>
              Patient Portal Account
            </span>
          </h2>

          <div className="ht-portal-layout">
            <div className="ht-portal-summary">
              <div className="ht-portal-info-block">
                <div className="ht-portal-info-title">
                  <span className="ht-portal-mini-check">✓</span>
                  <span>About Patient Portal</span>
                </div>
                <p className="ht-portal-info-text">
                  The patient will use this email address to sign in and view their health information,
                  appointments, and medical records.
                </p>
              </div>
            </div>

            <div className="ht-portal-form">
              <div className="ht-portal-status-row">
                <span>Account Status:</span>
                <span className="ht-portal-status ht-portal-status-inactive">Inactive</span>
              </div>

              <label className="ht-portal-field">
                <span>Email Address <span style={{ color: "var(--color-danger)" }}>*</span></span>
                <Input
                  type="email"
                  value={form.portal_email}
                  onChange={(e) => {
                    set("portal_email", e.target.value);
                    setPortalEmailError(null);
                  }}
                  placeholder="Enter email address (used for portal login)"
                />
                {portalEmailError && (
                  <span className="ht-portal-email-alert" role="alert">
                    {portalEmailError}
                  </span>
                )}
              </label>

              <label className="ht-portal-checkbox" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
                <input
                  type="checkbox"
                  checked={sendLoginCredentials}
                  onChange={(e) => setSendLoginCredentials(e.target.checked)}
                />
                <span>Send login credentials to this email address</span>
              </label>

              {sendLoginCredentials && (
                <p className="ht-muted text-sm" style={{ marginTop: "0.5rem" }}>
                  The patient will receive an email with login instructions.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="ht-form-actions">
          <button type="submit" className="ht-button" disabled={saving}>
            {saving ? "Saving..." : "Register Patient"}
          </button>
          <button type="button" onClick={() => setSearchParams({ page: "patients" })} className="ht-button ht-button-muted">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
