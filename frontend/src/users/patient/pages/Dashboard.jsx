import { useSearchParams } from "react-router";
import {
  CalendarDays,
  HeartPulse,
  ClipboardList,
  PersonStanding,
  House,
  Landmark,
  Phone,
  Clock,
  Eye,
  UserRound,
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
      <section className="patient-dashboard-intro">
        <div className="patient-dashboard-header">
          <div>
            <h1>Patient Dashboard</h1>
            <p>Your Personal Information, Scheduled Appointments, and Medical Records are all recorded by the Midwife.</p>
          </div>

          <button
            className="patient-dashboard-view-button"
            onClick={() =>
              setSearchParams({ page: "health-information" })
            }
          >
            <Eye size={20} />
            View Health Information
          </button>
        </div>

      </section>


      <div className="patient-metric-grid">

<PatientMetricCard
  icon={<CalendarDays size={32} strokeWidth={1.6} />}
        iconClass="appointment"
  title="My Appointments"
  description="View your upcoming and past appointments."
  onClick={() => setSearchParams({ page: "health-information", section: "appointments" })}
/>

<PatientMetricCard
  icon={<HeartPulse size={32} strokeWidth={1.6} />}
  iconClass="vitals"
  title="Vital Signs Records"
  description="View the most recently recorded vital signs."
  onClick={() => setSearchParams({ page: "health-information", section: "vital-signs" })}
/>

<PatientMetricCard
  icon={<ClipboardList size={32} strokeWidth={1.6} />}
  iconClass="assessment"
  title="Health Assessment"
  description="View your health assessment test results."
  onClick={() => setSearchParams({ page: "health-information", section: "health-assessment" })}
/>

<PatientMetricCard
  icon={<UserRound size={30} strokeWidth={1.8} />}
  iconClass="allergies"
  title="Portal Account"
  description="View your general information and account."
  onClick={() => setSearchParams({ page: "health-information", section: "patient-information" })}
/>

      </div>


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
            title="Brgy. Health Center"
            line1=" Diamond St. Mambog I, Bacoor, Cavite 4102"
            line2=" Contact Number | Hotline :0946 417 1932"
          />

          <ContactCard
            icon={<Landmark size={22} strokeWidth={1.8} />}
            title="City Gov. of Bacoor"
            line1=" Bacoor Blvd, Bayanan, City of Bacoor, Cavite"
            line2=" Dial: (046) 481 4100 or +63 46 481 4144"
          />

          <ContactCard
            icon={<Phone size={22} strokeWidth={1.8} />}
            title="Emergency Hotline"
            line1="Priority Emergency Hotline: call 161 or 911"
            line2="BDRRMO: (046) 417-0727 | 24/7 Available" 
          />

          <ContactCard
            icon={<Clock size={22} strokeWidth={1.8} />}
            title="Availability Hours"
            line1="Mon - Fri: 8:00 AM - 5:00 PM (government)"
            line2="Closed on weekends and special holidays"
          />

        </div>

      </section>


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
            text="Drink plenty of water everyday."
            type="water"
          />

          <TipItem
            icon={<Apple size={23} strokeWidth={1.8} />}
            text="Eat balanced and healthy meals."
            type="food"
          />

          <TipItem
            icon={<PersonStanding size={23} strokeWidth={1.8} />}
            text="Stay active and regular exercise."
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
        <Eye size={20} strokeWidth={2} />
        View Only
      </button>

    </div>
  );
}



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