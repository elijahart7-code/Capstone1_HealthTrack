import { Navigate, Route, Routes } from "react-router";
import LoginPage from "../auth/LoginPage";
import { ConfirmAccountPage, RequestAccountSetupPage } from "../auth/AccountSetupPage";
import { ProtectRoute } from "../lib/protectRoute";
import { getCurrentUser, homeRouteForRole } from "../lib/auth";

import { AdminShell } from "../users/admin/AdminShell";
import { HealthWorkerShell } from "../users/health_worker/HealthWorkerShell";
import { PatientShell } from "../users/patient/pages/PatientShell";

function DashboardRedirect() {
  const user = getCurrentUser();
  return <Navigate to={user ? homeRouteForRole(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="/login" element={<Navigate to="/patient/login" replace />} />
      <Route path="/patient/login" element={<LoginPage key="patient" accountType="patient" />} />
      <Route path="/admin/login" element={<LoginPage key="admin" accountType="admin" />} />
      <Route path="/health-worker/login" element={<LoginPage key="health_worker" accountType="health_worker" />} />
      <Route path="/setup-account" element={<RequestAccountSetupPage />} />
      <Route path="/confirm-account" element={<ConfirmAccountPage />} />

      <Route
        path="/admin"
        element={
          <ProtectRoute roles={["admin"]}>
            <AdminShell />
          </ProtectRoute>
        }
      />

      <Route
        path="/health_worker"
        element={
          <ProtectRoute roles={["health_worker"]}>
            <HealthWorkerShell />
          </ProtectRoute>
        }
      />

      <Route
        path="/patient"
        element={
          <ProtectRoute roles={["patient"]}>
            <PatientShell />
          </ProtectRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
