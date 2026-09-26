import { useSearchParams } from "react-router";
import {
  User,
  CalendarDays,
  HeartPulse,
  ClipboardList,
  ShieldAlert,
  ArrowRight,
  Eye,
  FileText,
  Building2,
  Phone,
  Clock3,
  Lightbulb,
  Droplets,
  Apple,
  PersonStanding,
  Moon,
  UserRound,
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

      {/* ================= PAGE HEADER ================= */}
      <section className="patient-dashboard-header">

        <div className="patient-dashboard-header-copy">
          <h1>Patient Dashboard</h1>

          <p>
            View your health information and medical records.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setSearchParams({ page: "health-information" })
          }
          className="patient-summary-button"
        >
          View Health Information
          <ArrowRight size={19} strokeWidth={2} />
        </button>

      </section>


      {/* ================= WELCOME ================= */}
      <section className="patient-welcome-simple">

        <div className="patient-welcome-icon">
          <UserRound size={39} strokeWidth={1.8} />
        </div>

        <div>
          <h2>Welcome, {patientName}!</h2>

          <p>
            Your records at Barangay Health Center of Mambog I.
          </p>
        </div>

      </section>


      {/* ================= QUICK INFORMATION ================= */}
      <div className="patient-metric-grid">

        <PatientMetricCard
          icon={<CalendarDays />}
          title="Upcoming Appointment"
          iconClass="appointment"
        />

        <PatientMetricCard
          icon={<HeartPulse />}
          title="Updated Vital Signs"
          iconClass="vitals"
        />

        <PatientMetricCard
          icon={<ClipboardList />}
          title="Health Assessment"
          iconClass="assessment"
        />

        <PatientMetricCard
          icon={<ShieldAlert />}
          title="Known Allergies"
          iconClass="allergies"
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
              Your Personal Information, Vital Signs, Health Assessment,
              Midwife Notes, Medical Histories and Allergies are all
              recorded by the Midwife and shown in one place.
            </p>

          </div>

        </div>

      </section>


      {/* ================= EMERGENCY CONTACT ================= */}
      <section className="patient-panel">

        <div className="patient-section-header">

          <div className="patient-panel-icon patient-panel-icon-small">
            <ShieldAlert size={20} strokeWidth={1.9} />
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
            icon={<User size={22} />}
            iconClass="blue"
            title="Barangay Mambog I"
            line1="Brgy. Mambog I, Bacoor, Cavite"
            line2="(046) 123-4567"
          />

          <ContactCard
            icon={<Building2 size={22} />}
            iconClass="blue"
            title="City Government of Bacoor"
            line1="Bacoor City Hall, Bacoor, Cavite"
            line2="(046) 417-3000"
          />

          <ContactCard
            icon={<Phone size={22} />}
            iconClass="blue"
            title="Emergency Hotline"
            line1="(046) 123-4567"
            line2="24/7 Available"
          />

          <ContactCard
            icon={<Clock3 size={22} />}
            iconClass="blue"
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
            <Lightbulb size={20} strokeWidth={1.9} />
          </div>

          <div>
            <h2>Health Tips for You</h2>
            <p>Health is your Wealth!</p>
          </div>

        </div>


        <div className="patient-tip-grid">

          <TipItem
            icon={<Droplets />}
            text="Drink plenty of water daily."
            type="water"
          />

          <TipItem
            icon={<Apple />}
            text="Eat balanced and healthy meals."
            type="food"
          />

          <TipItem
            icon={<PersonStanding />}
            text="Stay active and exercise."
            type="activity"
          />

          <TipItem
            icon={<Moon />}
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
}) {
  return (
    <div className="patient-metric-card">

      <div className="patient-metric-header">

        <div
          className={`patient-metric-title-icon ${iconClass}`}
        >
          {icon}
        </div>

        <h3>{title}</h3>

        <ArrowRight
          className="patient-metric-arrow"
          size={20}
          strokeWidth={1.8}
        />

      </div>

      <div className="patient-metric-space" />

      <button
        type="button"
        className="patient-view-button"
      >
        View Details
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
  iconClass,
  title,
  line1,
  line2,
}) {
  return (
    <div className="patient-contact-card">

      <div className={`patient-contact-icon ${iconClass}`}>
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