import { useState } from "react";
import { useSearchParams } from "react-router";
import { User, MapPin, PhoneCall } from "lucide-react";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Field, Input, Select, Textarea } from "../../../components/ui/Input";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CIVIL_STATUSES = ["single", "married", "widowed", "separated"];

/**
 * Registers a new patient. This form captures demographics only; portal login
 * creation is handled elsewhere through the patient record screen.
 */
export function RegisterPatient({ loadData, onRegistered }) {
  const [, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({
    full_name: "",
    sex: "",
    birthdate: "",
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
    portal_enabled: false,
    portal_email: "",
    send_login_credentials: true,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        portal_enabled: undefined,
        portal_email: undefined,
        send_login_credentials: undefined,
      };

      const { data } = await api.post("/patients", payload);

      if (form.portal_enabled && form.portal_email) {
        await api.post(`/patients/${data.patient.patient_id}/portal-account`, { email: form.portal_email });
      }

      await loadData();
      onRegistered(data.patient.patient_id);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not register this patient.");
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
            <Field label="Full Name" required>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Enter full name" />
            </Field>

            <Field label="Sex" required>
              <Select value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                <option value="">Enter sex</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </Field>

            <Field label="Date of Birth" required>
              <Input type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </Field>

            <Field label="Age" required>
              <Input value={""} onChange={() => {}} placeholder="Enter age" />
            </Field>

            <Field label="Civil Status" required>
              <Select value={form.civil_status} onChange={(e) => set("civil_status", e.target.value)}>
                <option value="">Enter civil status</option>
                {CIVIL_STATUSES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Blood Type" required>
              <Select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)}>
                <option value="">Enter blood type</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
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
                <p className="ht-portal-info-text">The patient will use this email address to sign in and view their health information, appointments, and medical records.</p>
              </div>
            </div>

            <div className="ht-portal-form">
              <div className="ht-portal-status-row">
                <span>Account Status:</span>
                <span className="ht-portal-status ht-portal-status-inactive">Inactive</span>
              </div>

              <Field label="Email Address" required={form.portal_enabled}>
                <Input
                  type="email"
                  value={form.portal_email}
                  onChange={(e) => {
                    set("portal_email", e.target.value);
                    set("portal_enabled", true);
                  }}
                  placeholder="Enter email address (used for portal login)"
                />
              </Field>

              <label className="ht-checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.send_login_credentials}
                  onChange={(e) => set("send_login_credentials", e.target.checked)}
                />
                <span>Send login credentials to this email address</span>
              </label>
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
