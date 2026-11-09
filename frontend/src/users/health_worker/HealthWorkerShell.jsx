import { useCallback, useEffect, useRef, useState } from "react";
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
  const [verificationNotice, setVerificationNotice] = useState(null);
  const [isClosingVerificationNotice, setIsClosingVerificationNotice] = useState(false);
  const verificationNoticeCloseTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(verificationNoticeCloseTimer.current), []);

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

  function goToPatient(patientId, verification) {
    window.clearTimeout(verificationNoticeCloseTimer.current);
    setIsClosingVerificationNotice(false);
    setVerificationNotice(verification || null);
    setSearchParams({ page: "patients", patientId });
  }

  const closeVerificationNotice = useCallback(() => {
    if (!verificationNotice || isClosingVerificationNotice) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingVerificationNotice(true);
    verificationNoticeCloseTimer.current = window.setTimeout(() => {
      setVerificationNotice(null);
      setIsClosingVerificationNotice(false);
    }, reduceMotion ? 0 : 220);
  }, [verificationNotice, isClosingVerificationNotice]);

  useEffect(() => {
    if (!verificationNotice) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") closeVerificationNotice();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [verificationNotice, closeVerificationNotice]);

  return (
    <div className="ht-healthworker-shell">
      <header className="ht-topbar">
        <div className="ht-topbar-inner">
          <button className="ht-brand" onClick={() => navigate("/health_worker")}>
            <span className="ht-brand-mark ht-brand-image-mark">
              <img src="/images/healthtrack-symbol.png" alt="" />
            </span>
            <span>HealthTrack</span>
          </button>
          <SideBar />
          <Header />
        </div>
      </header>

      <main className="ht-content">
        {verificationNotice && (
          <div
            className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosingVerificationNotice ? "is-closing" : ""}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeVerificationNotice();
            }}
          >
            <section
              aria-labelledby="patient-saved-title"
              aria-modal="true"
              className={`ht-confirm-dialog ht-archive-confirm-dialog ht-patient-saved-dialog ${isClosingVerificationNotice ? "is-closing" : ""}`}
              role="dialog"
            >
              <h2 id="patient-saved-title">
                {verificationNotice.status === "failed" ? "Patient Saved, Email Not Sent" : "Patient Saved"}
              </h2>
              <p className="ht-confirm-message" role="status">{verificationNotice.message}</p>
              <div className="ht-confirm-actions ht-archive-confirm-actions">
                <button type="button" className="ht-confirm-cancel" onClick={closeVerificationNotice}>Close</button>
              </div>
            </section>
          </div>
        )}
        {loadError && (page !== "patients" || patients.length === 0) ? (
          <div className="ht-panel">
            <p className="ht-muted text-sm">{loadError}</p>
            <button className="ht-button" onClick={loadData}>Try again</button>
          </div>
        ) : loading || (!dashboard && page !== "patients") ? (
          <p className="ht-muted text-sm">Loading...</p>
        ) : page === "patients" ? (
          <Patients patients={patients} loadData={loadData} />
        ) : page === "register-patient" ? (
          <RegisterPatient loadData={loadData} onRegistered={goToPatient} />
        ) : (
          <Dashboard dashboard={dashboard} onRegisterClick={() => setSearchParams({ page: "register-patient" })} />
        )}
      </main>
    </div>
  );
}
