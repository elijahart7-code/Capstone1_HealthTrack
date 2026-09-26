import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../../lib/axios";
import { SideBar } from "./components/SideBar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { Appointments } from "./pages/Appointments";

/**
 * Signed-in shell for the admin role. It owns page-level state and the data
 * fetch flow used across the admin dashboard and patient screens.
 */
export function AdminShell() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = searchParams.get("page") || "dashboard";

  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async (archived = showArchived) => {
    setLoading(true);
    setLoadError(null);

    const [dashboardResult, patientsResult, appointmentsResult] = await Promise.allSettled([
        api.get("/admin/dashboard"),
        api.get(`/patients${archived ? "?archived=true" : ""}`),
        api.get("/admin/appointments"),
      ]);

    if (dashboardResult.status === "fulfilled") {
      setDashboard(dashboardResult.value.data);
    }
    if (patientsResult.status === "fulfilled") {
      setPatients(patientsResult.value.data.patients || []);
    } else {
      setLoadError(
        patientsResult.reason?.response?.data?.error ||
          "Could not load the patient list."
      );
    }
    if (appointmentsResult.status === "fulfilled") {
      setAppointments(appointmentsResult.value.data.appointments || []);
    }
    if (dashboardResult.status === "rejected" && patientsResult.status === "fulfilled") {
      setLoadError(
        dashboardResult.reason?.response?.data?.error ||
          "Could not load the admin dashboard."
      );
    }

    setLoading(false);
  }, [showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <header className="ht-topbar">
        <div className="ht-topbar-inner">
          <button className="ht-brand" onClick={() => navigate("/admin")}>
            <span className="ht-brand-mark">HT</span>
            <span>HealthTrack</span>
          </button>
          <SideBar />
          <Header />
        </div>
      </header>

      <main className="ht-content">
        {loadError && (page !== "patients" || patients.length === 0) ? (
          <div className="ht-panel">
            <p className="ht-muted text-sm">{loadError}</p>
          </div>
        ) : loading || !dashboard ? (
          <p className="ht-muted text-sm">Loading...</p>
        ) : page === "patients" ? (
          <Patients
            patients={patients}
            loadData={loadData}
            showArchived={showArchived}
            onArchivedChange={setShowArchived}
          />
        ) : page === "appointments" ? (
          <Appointments appointments={appointments} loadData={loadData} />
        ) : (
          <Dashboard dashboard={dashboard} />
        )}
      </main>
    </>
  );
}
