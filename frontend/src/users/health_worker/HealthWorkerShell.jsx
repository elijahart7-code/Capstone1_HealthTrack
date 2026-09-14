import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../../lib/axios";
import { SideBar } from "./components/SideBar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { RegisterPatient } from "./pages/RegisterPatient";

export function HealthWorkerShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = searchParams.get("page") || "dashboard";

  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardRes, patientsRes] = await Promise.all([
        api.get("/health-worker/dashboard"),
        api.get("/patients"),
      ]);

      setDashboard(dashboardRes.data);
      setPatients(patientsRes.data.patients);
    } catch (err) {
      console.error("[HealthWorkerShell] Failed to load dashboard data:", err);
      setError(err?.response?.data?.error || "Unable to load the dashboard right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function goToPatient(patientId) {
    setSearchParams({ page: "patients", patientId });
  }

  return (
    <>
      <header className="ht-topbar">
        <div className="ht-topbar-inner">
          <button className="ht-brand" onClick={() => navigate("/health_worker")}>
            <span className="ht-brand-mark">HT</span>
            <span>HealthTrack</span>
          </button>
          <SideBar />
          <Header />
        </div>
      </header>

      <main className="ht-content">
        {loading ? (
          <p className="ht-muted text-sm">Loading...</p>
        ) : error ? (
          <div className="ht-panel">
            <h2 className="ht-section-title-wrap">Unable to load dashboard</h2>
            <p className="ht-muted" style={{ marginTop: "0.5rem" }}>{error}</p>
            <button className="ht-button" style={{ marginTop: "1rem" }} onClick={loadData}>
              Try again
            </button>
          </div>
        ) : page === "patients" ? (
          <Patients patients={patients} loadData={loadData} />
        ) : page === "register-patient" ? (
          <RegisterPatient loadData={loadData} onRegistered={goToPatient} />
        ) : (
          <Dashboard dashboard={dashboard} onRegisterClick={() => setSearchParams({ page: "register-patient" })} />
        )}
      </main>
    </>
  );
}
