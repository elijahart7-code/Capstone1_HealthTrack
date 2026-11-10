import { Navigate, Route, Routes } from "react-router";
import LoginPage from "../auth/LoginPage";
import { ConfirmAccountPage, RequestAccountSetupPage } from "../auth/AccountSetupPage";
import { ProtectRoute } from "../lib/protectRoute";
import { getCurrentUser, homeRouteForRole } from "../lib/auth";

import { PatientShell } from "../users/patient/pages/PatientShell";
import NotFoundPage from "./NotFoundPage";

function DashboardRedirect() {
  const user = getCurrentUser();
  return <Navigate to={user?.role === "patient" ? homeRouteForRole(user.role) : "/patient/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="/login" element={<Navigate to="/patient/login" replace />} />
      <Route path="/patient/login" element={<LoginPage key="patient" accountType="patient" />} />
      <Route path="/setup-account" element={<RequestAccountSetupPage />} />
      <Route path="/confirm-account" element={<ConfirmAccountPage />} />

      <Route
        path="/patient"
        element={
          <ProtectRoute roles={["patient"]}>
            <PatientShell />
          </ProtectRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
