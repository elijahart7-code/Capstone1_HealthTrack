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
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const [dashboardResult, patientsResult] = await Promise.allSettled([
      api.get("/health-worker/dashboard"),
      api.get("/patients"),
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

    setLoading(false);
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
        {loadError && (page !== "patients" || patients.length === 0) ? (
          <div className="ht-panel">
            <p className="ht-muted text-sm">{loadError}</p>
          </div>
        ) : loading || !dashboard ? (
          <p className="ht-muted text-sm">Loading...</p>
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
