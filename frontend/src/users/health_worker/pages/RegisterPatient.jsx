import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { User, MapPin, PhoneCall, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../../lib/axios";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Field, Input, Select, Textarea } from "../../../components/ui/Input";
import { PHILIPPINE_LOCATION_HIERARCHY, PHILIPPINE_REGIONS } from "../../../data/philippineLocations";

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
  const [selectedBirthRegion, setSelectedBirthRegion] = useState("");
  const [selectedBirthProvince, setSelectedBirthProvince] = useState("");
  const [selectedBirthCity, setSelectedBirthCity] = useState("");
  const [birthplaceOtherText, setBirthplaceOtherText] = useState("");
  const [birthplaceOpen, setBirthplaceOpen] = useState(false);
  const [birthplaceLevel, setBirthplaceLevel] = useState("region");
  const birthDatePickerRef = useRef(null);
  const birthplaceControlRef = useRef(null);
  const birthplaceInputRef = useRef(null);

  const birthplaceProvinces = PHILIPPINE_LOCATION_HIERARCHY[selectedBirthRegion] || {};
  const birthplaceCities = birthplaceProvinces[selectedBirthProvince] || [];
  const isBirthplaceOther = [selectedBirthRegion, selectedBirthProvince, selectedBirthCity].includes("other");
  const birthplaceDisplayValue = isBirthplaceOther
    ? birthplaceOtherText
    : [selectedBirthCity, selectedBirthProvince, selectedBirthRegion].filter(Boolean).join(", ");

  useEffect(() => {
    if (!birthplaceOpen) return undefined;

    function closeBirthplaceMenu(event) {
      if (!birthplaceControlRef.current?.contains(event.target)) setBirthplaceOpen(false);
    }

    document.addEventListener("mousedown", closeBirthplaceMenu);
    return () => document.removeEventListener("mousedown", closeBirthplaceMenu);
  }, [birthplaceOpen]);

  useEffect(() => {
    if (isBirthplaceOther) birthplaceInputRef.current?.focus();
  }, [isBirthplaceOther]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function getDaysInMonth(month, year) {
    const monthNumber = Number(month);
    const yearNumber = Number(year) || new Date().getFullYear();

    if (monthNumber === 2) {
      const isLeapYear = (yearNumber % 4 === 0 && yearNumber % 100 !== 0) || yearNumber % 400 === 0;
      return isLeapYear ? 29 : 28;
    }

    if ([4, 6, 9, 11].includes(monthNumber)) return 30;
    return 31;
  }

  function normalizeDateText(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (!digits) return "";

    let day = digits.slice(0, 2);
    let month = digits.slice(2, 4);
    let year = digits.slice(4, 8);

    if (day) {
      const dayNumber = Number(day);
      if (dayNumber > 31) day = "31";
    }

    if (month) {
      const monthNumber = Number(month);
      if (monthNumber > 12) month = "12";
      if (monthNumber === 0) month = "01";
    }

    if (month) {
      const maxDay = getDaysInMonth(month, year || new Date().getFullYear());
      const dayNumber = Number(day || "0");
      if (dayNumber > maxDay) day = String(maxDay).padStart(2, "0");
    }

    if (digits.length <= 2) return day;
    if (digits.length <= 4) return `${day}/${month}`;
    return `${day}/${month}/${year}`;
  }

  function toIsoDate(value) {
    if (!value) return "";
    const parts = value.split("/");
    if (parts.length !== 3) return value;
    const [day, month, year] = parts;
    if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
      return value;
    }
    return `${year}-${month}-${day}`;
  }

  function formatIsoToText(value) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "";
    return `${day}/${month}/${year}`;
  }

  function handleBirthDatePicker(value) {
    set("birthdate", formatIsoToText(value));
  }

  function syncBirthPlace(region, province, city, otherText = "") {
    if ([region, province, city].includes("other")) {
      set("place_of_birth", otherText.trim());
      return;
    }

    set("place_of_birth", [city, province, region].filter(Boolean).join(", "));
  }

  function handleBirthRegionChange(region) {
    setSelectedBirthRegion(region);
    setSelectedBirthProvince("");
    setSelectedBirthCity("");
    setBirthplaceOtherText("");
    syncBirthPlace(region, "", "");
    setBirthplaceLevel("province");
    setBirthplaceOpen(region !== "other");
  }

  function handleBirthProvinceChange(province) {
    setSelectedBirthProvince(province);
    setSelectedBirthCity("");
    setBirthplaceOtherText("");
    syncBirthPlace(selectedBirthRegion, province, "");
    setBirthplaceLevel("city");
    setBirthplaceOpen(province !== "other");
  }

  function handleBirthCityChange(city) {
    setSelectedBirthCity(city);
    setBirthplaceOtherText("");
    syncBirthPlace(selectedBirthRegion, selectedBirthProvince, city);
    setBirthplaceOpen(false);
  }

  function handleBirthplaceOtherTextChange(value) {
    setBirthplaceOtherText(value);
    syncBirthPlace(selectedBirthRegion, selectedBirthProvince, selectedBirthCity, value);
  }

  function toggleBirthplaceMenu() {
    if (isBirthplaceOther) {
      setSelectedBirthRegion("");
      setSelectedBirthProvince("");
      setSelectedBirthCity("");
      setBirthplaceOtherText("");
      set("place_of_birth", "");
      setBirthplaceLevel("region");
      setBirthplaceOpen(true);
      return;
    }

    if (!birthplaceOpen) {
      setBirthplaceLevel(
        !selectedBirthRegion ? "region" : !selectedBirthProvince ? "province" : "city",
      );
    }
    setBirthplaceOpen((open) => !open);
  }

  function selectBirthplaceOther() {
    if (birthplaceLevel === "region") handleBirthRegionChange("other");
    if (birthplaceLevel === "province") handleBirthProvinceChange("other");
    if (birthplaceLevel === "city") handleBirthCityChange("other");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setPortalEmailError(null);

    const birthplaceSelectionComplete = selectedBirthRegion && (
      selectedBirthRegion === "other" || (selectedBirthProvince && (
        selectedBirthProvince === "other" || selectedBirthCity
      ))
    );
    if (!birthplaceSelectionComplete || (isBirthplaceOther && !form.place_of_birth.trim())) {
      setError("Please select the patient's place of birth.");
      return;
    }

    setSaving(true);
    try {
      const finalPayload = {
        ...form,
        birthdate: toIsoDate(form.birthdate),
      };

      const { data } = await api.post("/patients", finalPayload);

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
        <button onClick={() => setSearchParams({ page: "patients" })} className="ht-button ht-button-strong-green">
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

            <Field label="Middle Name" required>
              <Input value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} placeholder="Enter middle name" required />
            </Field>

            <Field label="Last Name" required>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Enter last name" />
            </Field>

            <Field label="Sex" required>
              <Select value={form.sex} onChange={(e) => set("sex", e.target.value)} required>
                <option value="" disabled>Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </Field>

            <Field label="Date of Birth" required>
              <div className="ht-date-input-wrap">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.birthdate}
                  onChange={(e) => set("birthdate", normalizeDateText(e.target.value))}
                  placeholder="dd/mm/yyyy"
                />
                <input
                  ref={birthDatePickerRef}
                  type="date"
                  value={toIsoDate(form.birthdate)}
                  onChange={(e) => handleBirthDatePicker(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="ht-date-picker-hidden"
                />
                <button
                  type="button"
                  className="ht-date-icon-button"
                  onClick={() => birthDatePickerRef.current?.showPicker?.() || birthDatePickerRef.current?.focus()}
                  aria-label="Open calendar"
                >
                  <CalendarDays className="ht-date-icon" size={16} strokeWidth={1.8} />
                </button>
              </div>
            </Field>

            <Field label="Age" required>
              <Select value={form.age} onChange={(e) => set("age", e.target.value)} required>
                <option value="" disabled>Select age</option>
                {Array.from({ length: 121 }, (_, age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </Select>
            </Field>

            <Field label="Civil Status" required>
              <Select value={form.civil_status} onChange={(e) => set("civil_status", e.target.value)} required>
                <option value="" disabled>Select civil status</option>
                <option value="Single">Single</option>
                <option value="In a relationship">In a relationship</option>
                <option value="Engaged">Engaged</option>
                <option value="Married">Married</option>
                <option value="In a civil union">In a civil union</option>
                <option value="In a domestic partnership">In a domestic partnership</option>
                <option value="In an open relationship">In an open relationship</option>
                <option value="It's complicated">It's complicated</option>
                <option value="Separated">Separated</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </Select>
            </Field>

            <Field label="Blood Type" required>
              <Select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} required>
                <option value="" disabled>Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A−</option>
                <option value="B+">B+</option>
                <option value="B-">B−</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB−</option>
                <option value="O+">O+</option>
                <option value="O-">O−</option>
              </Select>
            </Field>

            <Field label="Nationality" required>
              <Select value={form.nationality} onChange={(e) => set("nationality", e.target.value)} required>
                <option value="" disabled>Select nationality</option>
                <option value="Filipino">Filipino</option>
                <option value="American">American</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Singaporean">Singaporean</option>
                <option value="Malaysian">Malaysian</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Indian">Indian</option>
                <option value="British">British</option>
                <option value="Canadian">Canadian</option>
                <option value="Australian">Australian</option>
                <option value="Taiwanese">Taiwanese</option>
                <option value="Hong Konger">Hong Konger</option>
                <option value="German">German</option>
                <option value="French">French</option>
                <option value="Italian">Italian</option>
                <option value="Spanish">Spanish</option>
                <option value="New Zealander">New Zealander</option>
                <option value="Swiss">Swiss</option>
                <option value="Dutch">Dutch</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Thai">Thai</option>
                <option value="Emirati">Emirati</option>
                <option value="Other / Not Listed">Other / Not Listed</option>
              </Select>
            </Field>

            <Field label="Contact Number" required>
              <Input value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)} placeholder="Enter contact number" />
            </Field>

            <Field label="Barangay ID Number" required>
              <Input value={form.barangay_id_number} onChange={(e) => set("barangay_id_number", e.target.value)} placeholder="Enter barangay ID number" />
            </Field>

            <Field label="Occupation" required>
              <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Enter occupation" />
            </Field>

            <div className="ht-field ht-place-of-birth-field">
              <span>Place of Birth<span style={{ color: "var(--color-danger)" }}>*</span></span>
              <div className="ht-place-of-birth-control" ref={birthplaceControlRef}>
                <div className="ht-place-of-birth-input-wrap">
                  <Input
                    ref={birthplaceInputRef}
                    value={birthplaceDisplayValue}
                    onChange={(e) => handleBirthplaceOtherTextChange(e.target.value)}
                    onClick={() => !isBirthplaceOther && toggleBirthplaceMenu()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isBirthplaceOther) {
                        e.preventDefault();
                        toggleBirthplaceMenu();
                      }
                      if (e.key === "Escape") setBirthplaceOpen(false);
                    }}
                    placeholder={isBirthplaceOther ? "Type region, province, city, or municipality" : "Select region, province, and city/municipality"}
                    readOnly={!isBirthplaceOther}
                    aria-expanded={!isBirthplaceOther && birthplaceOpen}
                    aria-haspopup="listbox"
                    aria-label="Place of Birth"
                    required={!isBirthplaceOther}
                    className="ht-place-of-birth-input"
                  />
                  <button
                    type="button"
                    className="ht-place-of-birth-toggle"
                    onClick={toggleBirthplaceMenu}
                    aria-label={isBirthplaceOther ? "Choose a listed place of birth" : "Open place of birth choices"}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                </div>

                {isBirthplaceOther && (
                  <span className="ht-place-of-birth-help">
                    Enter the complete place of birth if it is not available in the list.
                  </span>
                )}

                {birthplaceOpen && !isBirthplaceOther && (
                  <div className="ht-place-of-birth-menu">
                    <div className="ht-place-of-birth-menu-header">
                      {birthplaceLevel !== "region" && (
                        <button
                          type="button"
                          className="ht-place-of-birth-back"
                          onClick={() => setBirthplaceLevel(birthplaceLevel === "city" ? "province" : "region")}
                        >
                          <ChevronLeft size={15} aria-hidden="true" /> Back
                        </button>
                      )}
                      <span>
                        {birthplaceLevel === "region" && "Select region"}
                        {birthplaceLevel === "province" && `${selectedBirthRegion} · Select province`}
                        {birthplaceLevel === "city" && `${selectedBirthProvince} · Select city/municipality`}
                      </span>
                    </div>
                    <div className="ht-place-of-birth-options" role="listbox" aria-label="Place of birth choices">
                      {(birthplaceLevel === "region"
                        ? PHILIPPINE_REGIONS
                        : birthplaceLevel === "province"
                          ? Object.keys(birthplaceProvinces)
                          : birthplaceCities
                      ).map((option) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          className="ht-place-of-birth-option"
                          key={option}
                          onClick={() => {
                            if (birthplaceLevel === "region") handleBirthRegionChange(option);
                            else if (birthplaceLevel === "province") handleBirthProvinceChange(option);
                            else handleBirthCityChange(option);
                          }}
                        >
                          {option}
                          <ChevronRight size={15} aria-hidden="true" />
                        </button>
                      ))}
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="ht-place-of-birth-option ht-place-of-birth-option-other"
                        onClick={selectBirthplaceOther}
                      >
                        Other
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
