import { useSearchParams } from "react-router";

import {
  User,
  CalendarDays,
  HeartPulse,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  Building2,
  Phone,
  Clock3,
  Lightbulb,
  Droplets,
  Apple,
  PersonStanding,
  Moon,
  FileText,
  Activity,
  Pill,
} from "lucide-react";

export function Dashboard({ dashboard }) {
  const [, setSearchParams] = useSearchParams();

  if (!dashboard.patient) {
    return (
      <div className="grid gap-4">
        <section className="ht-page-header">
          <div>
            <h1>No patient record found</h1>
          </div>
        </section>

        <div className="ht-panel">
          <div className="ht-empty">
            Your account is not linked to a patient record yet.

            <span className="mt-2 block text-xs">
              Please contact the Barangay Health Center of Mambog I so a
              health worker can link it.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const patientName = dashboard.patient.first_name;

  return (
    <div className="patient-dashboard-shell">

      {/* PATIENT DASHBOARD HEADER */}
      <section className="patient-dashboard-header">

        <div className="patient-dashboard-header-copy">
          <h1>Patient Dashboard</h1>

          <p>
            View your health information and medical records.
          </p>
        </div>

        <button
          type="button"
          className="patient-header-health-button"
          onClick={() =>
            setSearchParams({ page: "health-information" })
          }
        >
          View Health Information
          <ArrowRight size={20} />
        </button>

      </section>


      {/* WELCOME SECTION */}
      <section className="patient-welcome-banner">

        <div className="patient-profile-circle" aria-hidden="true">
          <User size={42} strokeWidth={1.8} />
        </div>

        <div className="patient-welcome-copy">

          <h2>Welcome, {patientName}!</h2>

          <p>
            Your records at Barangay Health Center of Mambog I.
          </p>

        </div>

      </section>


      {/* QUICK INFORMATION CARDS */}
      <div className="patient-metric-grid">

        <PatientMetricCard
          type="appointment"
          icon={<CalendarDays />}
          title={
            <>
              Upcoming
              <br />
              Appointment
            </>
          }
          detailIcon={<CalendarDays />}
          detail={
            <>
              No upcoming
              <br />
              appointment
            </>
          }
        />

        <PatientMetricCard
          type="vitals"
          icon={<HeartPulse />}
          title="Updated Vital Signs"
          detailIcon={<Activity />}
          detail={
            <>
              Last updated:
              <br />
              —
            </>
          }
        />

        <PatientMetricCard
          type="assessment"
          icon={<ClipboardList />}
          title="Health Assessment"
          detailIcon={<FileText />}
          detail={
            <>
              Latest assessment:
              <br />
              —
            </>
          }
        />

        <PatientMetricCard
          type="allergies"
          icon={<ShieldAlert />}
          title="Known Allergies"
          detailIcon={<Pill />}
          detail={
            <>
              No recorded
              <br />
              allergies
            </>
          }
        />

      </div>


      {/* HEALTH INFORMATION */}
      <section className="patient-health-summary">

        <div className="patient-health-summary-icon">
          <FileText size={31} strokeWidth={1.8} />
        </div>

        <div className="patient-health-copy">

          <h2>Your Health Information</h2>

          <p>
            Your Personal Information, Vital Signs, Health Assessment,
            Midwife Notes, Medical Histories and Allergies are all
            recorded by the Midwife and shown in one place.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            setSearchParams({ page: "health-information" })
          }
          className="patient-summary-button"
        >
          View My Health Information
          <ArrowRight size={19} />
        </button>

      </section>


      {/* EMERGENCY CONTACT */}
      <section className="patient-panel patient-emergency-section">

        <div className="patient-section-header">

          <div className="patient-panel-icon patient-panel-icon-small">
            <ShieldAlert size={20} strokeWidth={1.8} />
          </div>

          <div>
            <h2>Emergency Contact</h2>

            <p>
              Important contacts and information in case of emergency.
            </p>
          </div>

        </div>


        <div className="patient-emergency-grid">

          <ContactCard
            type="barangay"
            icon={<User />}
            title="Barangay Mambog I"
            line1="Brgy. Mambog I, Bacoor, Cavite"
            line2="(046) 123-4567"
          />

          <ContactCard
            type="government"
            icon={<Building2 />}
            title="City Government of Bacoor"
            line1="Bacoor City Hall, Bacoor, Cavite"
            line2="(046) 417-3000"
          />

          <ContactCard
            type="hotline"
            icon={<Phone />}
            title="Emergency Hotline"
            line1="(046) 123-4567"
            line2="24/7 Available"
          />

          <ContactCard
            type="hours"
            icon={<Clock3 />}
            title="Office Hours"
            line1="Mon - Fri: 8:00 AM - 5:00 PM"
            line2="(Closed on weekends and holidays)"
          />

        </div>

      </section>


      {/* HEALTH TIPS */}
      <section className="patient-panel patient-health-tips">

        <div className="patient-tips-heading">

          <div className="patient-panel-icon patient-panel-icon-small">
            <Lightbulb size={20} strokeWidth={1.8} />
          </div>

          <div>
            <h2>Health Tips for You</h2>
            <p>Health is your Wealth!</p>
          </div>

        </div>


        <div className="patient-tip-grid">

          <TipItem
            type="water"
            icon={<Droplets />}
            text="Drink plenty of water daily."
          />

          <TipItem
            type="food"
            icon={<Apple />}
            text="Eat balanced and healthy meals."
          />

          <TipItem
            type="exercise"
            icon={<PersonStanding />}
            text="Stay active and exercise."
          />

          <TipItem
            type="sleep"
            icon={<Moon />}
            text="Get enough rest and sleep well."
          />

        </div>

      </section>

    </div>
  );
}


/* =========================================================
   QUICK INFORMATION CARD
========================================================= */

function PatientMetricCard({
  type,
  icon,
  title,
  detailIcon,
  detail,
}) {
  return (
    <div className={`patient-metric-card patient-metric-${type}`}>

      <div className="patient-metric-header">

        <div className="patient-metric-title-icon">
          {icon}
        </div>

        <h3>{title}</h3>

        <ArrowRight
          className="patient-metric-arrow"
          size={21}
        />

      </div>

      <div className="patient-metric-detail">

        <div className="patient-metric-detail-icon">
          {detailIcon}
        </div>

        <span>
          {detail}
        </span>

      </div>
  );
}


/* =========================================================
   EMERGENCY CONTACT CARD
========================================================= */

function ContactCard({
  type,
  icon,
  title,
  line1,
  line2,
}) {
  return (
    <div className={`patient-contact-card patient-contact-${type}`}>

      <div className="patient-contact-icon">
        {icon}
      </div>

      <div className="patient-contact-body">

        <h3>{title}</h3>

        <p>{line1}</p>

        <span>{line2}</span>

      </div>

    </div>
  );
}


/* =========================================================
   HEALTH TIP CARD
========================================================= */

function TipItem({
  type,
  icon,
  text,
}) {
  return (
    <div className={`patient-tip-item patient-tip-${type}`}>

      <div className="patient-tip-icon">
        {icon}
      </div>

      <span>{text}</span>

    </div>
  );
}