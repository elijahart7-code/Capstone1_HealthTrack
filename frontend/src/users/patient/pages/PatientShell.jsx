import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../../../lib/axios";
import { SideBar } from "../components/SideBar";
import { Header } from "../components/Header";
import { Dashboard } from "../pages/Dashboard";
import { HealthInformation } from "../pages/HealthInformation";

export function PatientShell() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = searchParams.get("page") || "dashboard";

  const [dashboard, setDashboard] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dashboardRes, healthInfoRes] = await Promise.all([
      api.get("/patient/dashboard"),
      api.get("/patient/health-information"),
    ]);
    setDashboard(dashboardRes.data);
    setHealthInfo(healthInfoRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <header className="ht-topbar">
        <div className="ht-topbar-inner">
          <button className="ht-brand" onClick={() => navigate("/patient")}>
            <span className="ht-brand-mark">HT</span>
            <span>HealthTrack</span>
          </button>
          <SideBar />
          <Header />
        </div>
      </header>

      <main className="ht-content">
        {loading || !dashboard || !healthInfo ? (
          <p className="ht-muted text-sm">Loading...</p>
        ) : page === "health-information" ? (
          <HealthInformation healthInfo={healthInfo} />
        ) : (
          <Dashboard dashboard={dashboard} />
        )}
      </main>
    </>
  );
}