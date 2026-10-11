import { useSearchParams } from "react-router";
import {
  UserRound,
  CalendarDays,
  HeartPulse,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  FileText,
  PersonStanding,
  House,
  Landmark,
  Phone,
  Clock,
  Droplet,
  Apple,
  Activity,
  Moon,
} from "lucide-react";

export function Dashboard({ dashboard }) {
  const [, setSearchParams] = useSearchParams();

  if (!dashboard.patient) {
    return (
      <div className="grid gap-4">
        <section className="ht-page-header">
          <div>
            <h1>No patient record found</h1>
            <p>
              Your patient record is not linked to your account yet.
            </p>
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
      {/*Patient Dashboard*/}
      <div className="patient-dashboard-header">
  <div>
    <h1>Patient Dashboard</h1>
    <p>View your health information and medical records.</p>
  </div>

  <button
    className="patient-dashboard-view-button"
    onClick={() =>
      setSearchParams({ page: "health-information" })
    }
  >
    View Health Information
    <ArrowRight size={18} />
  </button>
</div>
      {/* ================= WELCOME ================= */}
      <section className="patient-welcome-simple">

        <div className="patient-welcome-icon">
          <UserRound size={38} strokeWidth={1.8} />
        </div>

        <div className="patient-welcome-copy">
          <span className="patient-welcome-eyebrow">Welcome back,</span>
          <h2>{patientName}!</h2>

          <p>
            Your records at Barangay Health Center of Mambog I.
          </p>

          <blockquote>
            Take care of your health today for a better tomorrow.
          </blockquote>
        </div>
      </section>


      {/* ================= QUICK INFORMATION ================= */}
      <div className="patient-metric-grid">

        <PatientMetricCard
  icon={<CalendarDays size={25} strokeWidth={1.6} />}
        iconClass="appointment"
  title="Upcoming Appointment"
  description="View your scheduled appointments."
  onClick={() => setSearchParams({ page: "health-information", section: "appointments" })}
/>

<PatientMetricCard
  icon={<HeartPulse size={25} strokeWidth={1.6} />}
  iconClass="vitals"
  title="Updated Vital Signs"
  description="View your latest vital sign records."
  onClick={() => setSearchParams({ page: "health-information", section: "vital-signs" })}
/>

<PatientMetricCard
  icon={<ClipboardList size={25} strokeWidth={1.6} />}
  iconClass="assessment"
  title="Health Assessment"
  description="View your health assessment records."
  onClick={() => setSearchParams({ page: "health-information", section: "health-assessment" })}
/>

<PatientMetricCard
  icon={<ShieldAlert size={25} strokeWidth={1.6} />}
  iconClass="allergies"
  title="Known Allergies"
  description="View your recorded allergy information."
  onClick={() => setSearchParams({ page: "health-information", section: "allergies" })}
/>

      </div>


      {/* ================= HEALTH INFORMATION ================= */}
      <section className="patient-health-summary">

        <div className="patient-health-heading">

          <div className="patient-health-summary-icon">
            <FileText size={34} strokeWidth={1.8} />
          </div>

          <div className="patient-health-copy">

            <h2>Your Health Information</h2>

            <p>
              Your personal information, Vital Signs, Health Assessment,
              Midwife Notes, Medical History and Allergies are all
              recorded by the Midwife and shown in one place.
            </p>

          </div>

        </div>

      </section>


      {/* ================= EMERGENCY CONTACT ================= */}
      <section className="patient-panel">

        <div className="patient-section-header">

          <div className="patient-panel-icon patient-panel-icon-small">
            <Phone size={20} strokeWidth={1.9} />
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
            icon={<House size={22} strokeWidth={1.8} />}
            title="Barangay Health Center"
            line1="Brgy. Mambog I, Bacoor, Cavite"
            line2="(046) 123-4567"
          />

          <ContactCard
            icon={<Landmark size={22} strokeWidth={1.8} />}
            title="City Government of Bacoor"
            line1="Bacoor City Hall, Bacoor, Cavite"
            line2="(046) 417-3000"
          />

          <ContactCard
            icon={<Phone size={22} strokeWidth={1.8} />}
            title="Emergency Hotline"
            line1="(046) 123-4567"
            line2="24/7 Available"
          />

          <ContactCard
            icon={<Clock size={22} strokeWidth={1.8} />}
            title="Office Hours"
            line1="Mon - Fri: 8:00 AM - 5:00 PM"
            line2="Closed on weekends and holidays"
          />

        </div>

      </section>


      {/* ================= HEALTH TIPS ================= */}
      <section className="patient-panel patient-health-tips">

        <div className="patient-tips-heading">

          <div className="patient-panel-icon patient-panel-icon-small">
            <HeartPulse size={22} strokeWidth={1.8} />
          </div>

          <div>
            <h2>Health Tips for You</h2>
            <p>Simple habits for a healthier and happier you.</p>
          </div>

        </div>


        <div className="patient-tip-grid">

          <TipItem
            icon={<Droplet size={23} strokeWidth={1.8} />}
            text="Drink plenty of water daily."
            type="water"
          />

          <TipItem
            icon={<Apple size={23} strokeWidth={1.8} />}
            text="Eat balanced and healthy meals."
            type="food"
          />

          <TipItem
            icon={<PersonStanding size={23} strokeWidth={1.8} />}
            text="Stay active and exercise."
            type="activity"
          />

          <TipItem
            icon={<Moon size={23} strokeWidth={1.8} />}
            text="Get enough rest and sleep well."
            type="sleep"
          />

        </div>

      </section>

    </div>
  );
}


/* =====================================================
   QUICK INFORMATION CARD
   ===================================================== */

function PatientMetricCard({
  icon,
  title,
  iconClass,
  description,
  onClick,
}) {
  return (
    <div className="patient-metric-card">

      <div className="patient-metric-content">
        <div
          className={`patient-metric-title-icon ${iconClass}`}
        >
          {icon}
        </div>
        <div className="patient-metric-copy">
          <h3>{title}</h3>
          <p className="patient-metric-description">{description}</p>
        </div>
      </div>

      <button
        type="button"
        className="patient-view-button"
        onClick={onClick}
      >
        View Only
        <ArrowRight size={17} strokeWidth={2} />
      </button>

    </div>
  );
}


/* =====================================================
   EMERGENCY CONTACT CARD
   ===================================================== */

function ContactCard({
  icon,
  title,
  line1,
  line2,
}) {
  return (
    <div className="patient-contact-card">

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


/* =====================================================
   HEALTH TIP
   ===================================================== */

function TipItem({
  icon,
  text,
  type,
}) {
  return (
    <div className={`patient-tip-item ${type}`}>

      <div className="patient-tip-icon">
        {icon}
      </div>

      <span>{text}</span>

    </div>
  );
}