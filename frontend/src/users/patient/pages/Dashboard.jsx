import { useSearchParams } from "react-router";
import {User,CalendarDays,HeartPulse,ClipboardList,ShieldAlert,ArrowRight,Eye,FileText,Building2,Phone,Clock3,Lightbulb,Droplets,Apple,PersonStanding,Moon,} from "lucide-react";

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

      {/* WELCOME SECTION /}
      <section className="patient-welcome-banner">
        <div className="patient-profile-circle" aria-hidden="true">
          <User size={42} strokeWidth={2} />
        </div>

        <div className="patient-welcome-copy">
          <h1>Welcome, {patientName}</h1>
          <p>
            Your records at Barangay Health Center of Mambog I.
          </p>
        </div>

        <button
          type="button"
          className="patient-portal-button"
        >
          Patient Portal
          <ArrowRight
            size={18}
            strokeWidth={1.9}
            style={{ transform: "rotate(-45deg)" }}
          />
        </button>
      </section>

      {/* QUICK INFORMATION CARDS */}
      <div className="patient-metric-grid">

        <PatientMetricCard
          icon={<CalendarDays size={25} strokeWidth={1.10} />}
          title="Upcoming Appointment"
        />

        <PatientMetricCard
          icon={<HeartPulse size={25} strokeWidth={1.10} />}
          title="Updated Vital Signs"
        />

        <PatientMetricCard
          icon={<ClipboardList size={25} strokeWidth={1.10} />}
          title="Health Assessment"
        />

        <PatientMetricCard
          icon={<ShieldAlert size={25} strokeWidth={1.10} />}
          title="Known Allergies"
        />

      </div>

      {/* HEALTH INFORMATION */}
      <section className="patient-panel patient-health-summary">

        <div className="patient-health-copy">

          <div className="patient-panel-icon" aria-hidden="true">
            <FileText size={24} strokeWidth={1.10} />
          </div>

          <h2>Your Health Information</h2>

          <p>
            Your Personal Information, Vital Signs, Health Assessment,
            Midwife Notes, Medical Histories and Allergies are all
            recorded by the Midwife and shown in one place.
          </p>

          <button
            type="button"
            onClick={() =>
              setSearchParams({ page: "health-information" })
            }
            className="patient-summary-button"
          >
            View My Health Information
            <ArrowRight size={18} strokeWidth={1.9} />
          </button>

        
        </div>

      </section>

      {/* EMERGENCY CONTACT */}
      <section className="patient-panel">

        <div className="patient-section-header">

          <div className="patient-panel-icon patient-panel-icon-small">
            <ShieldAlert size={19} strokeWidth={1.9} />
          </div>

          <div>
            <h2>Emergency Contact</h2>
            <p>
              Important contacts and information in case of emergency
            </p>
          </div>

        </div>

        <div className="patient-emergency-grid">

          <ContactCard
            icon={<User size={21} strokeWidth={1.8} />}
            title="Barangay Mambog I"
            line1="Brgy. Mambog I, Bacoor, Cavite"
            line2="(046) 123-4567"
          />

          <ContactCard
            icon={<Building2 size={21} strokeWidth={1.8} />}
            title="City Government of Bacoor"
            line1="Bacoor City Hall, Bacoor, Cavite"
            line2="(046) 417-3000"
          />

          <ContactCard
            icon={<Phone size={21} strokeWidth={1.8} />}
            title="Emergency Hotline"
            line1="(046) 123-4567"
            line2="24/7 Available"
          />

          <ContactCard
            icon={<Clock3 size={21} strokeWidth={1.8} />}
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
            <Lightbulb size={19} strokeWidth={1.9} />
          </div>

          <div>
            <h2>Health Tips for You</h2>
            <p>Health is your Wealth!</p>
          </div>

        </div>

        <div className="patient-tip-grid">

          <TipItem
            icon={<Droplets size={22} strokeWidth={1.8} />}
            text="Drink plenty of water daily."
          />

          <TipItem
            icon={<Apple size={22} strokeWidth={1.8} />}
            text="Eat balanced and healthy meals."
          />

          <TipItem
            icon={<PersonStanding size={22} strokeWidth={1.8} />}
            text="Stay active and exercise."
          />

          <TipItem
            icon={<Moon size={22} strokeWidth={1.8} />}
            text="Get enough rest and sleep well."
          />

        </div>

      </section>

    </div>
  );
}


/* QUICK INFORMATION CARD */
function PatientMetricCard({ icon, title }) {
  return (
    <div className="patient-metric-card">

      <div className="patient-metric-top">
        <div className="patient-metric-icon">
          {icon}
        </div>

        <h3>{title}</h3>
      </div>

      <button type="button" className="patient-view-button">
        <Eye size={19} strokeWidth={1.8} />
        View Only
      </button>

    </div>
  );
}


/* EMERGENCY CONTACT CARD */
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


/* HEALTH TIP CARD */
function TipItem({ icon, text }) {
  return (
    <div className="patient-tip-item">

      <div className="patient-tip-icon">
        {icon}
      </div>

      <span>{text}</span>

    </div>
  );
}