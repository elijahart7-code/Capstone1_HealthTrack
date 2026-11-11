import { Navigate, Route, Routes } from "react-router";
import SiteKeyGate from "../auth/SiteKeyGate";
import LoginPage from "../auth/LoginPage";
import { ProtectRoute } from "../lib/protectRoute";
import { getCurrentUser } from "../lib/auth";
import { HealthWorkerShell } from "../users/health_worker/HealthWorkerShell";
import NotFoundPage from "./NotFoundPage";

export default function HealthWorkerApp() {
  return (
    <SiteKeyGate>
    <Routes>
      <Route path="/" element={<Navigate to={getCurrentUser()?.role === "health_worker" ? "/health_worker" : "/health-worker/login"} replace />} />
      <Route path="/login" element={<Navigate to="/health-worker/login" replace />} />
      <Route path="/health-worker/login" element={<LoginPage accountType="health_worker" />} />
      <Route path="/health_worker" element={<ProtectRoute roles={["health_worker"]}><HealthWorkerShell /></ProtectRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </SiteKeyGate>
  );
}
