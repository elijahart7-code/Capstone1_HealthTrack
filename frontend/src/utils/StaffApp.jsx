import { Navigate, Route, Routes } from "react-router";
import LoginPage from "../auth/LoginPage";
import { ProtectRoute } from "../lib/protectRoute";
import { getCurrentUser, homeRouteForRole } from "../lib/auth";
import { AdminShell } from "../users/admin/AdminShell";
import { HealthWorkerShell } from "../users/health_worker/HealthWorkerShell";
import NotFoundPage from "./NotFoundPage";

function DashboardRedirect() {
  const user = getCurrentUser();
  const isStaff = ["admin", "health_worker"].includes(user?.role);
  return <Navigate to={isStaff ? homeRouteForRole(user.role) : "/health-worker/login"} replace />;
}

export default function StaffApp() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRedirect />} />
      <Route path="/login" element={<Navigate to="/health-worker/login" replace />} />
      <Route path="/admin/login" element={<LoginPage key="admin" accountType="admin" />} />
      <Route path="/health-worker/login" element={<LoginPage key="health_worker" accountType="health_worker" />} />
      <Route path="/admin" element={<ProtectRoute roles={["admin"]}><AdminShell /></ProtectRoute>} />
      <Route path="/health_worker" element={<ProtectRoute roles={["health_worker"]}><HealthWorkerShell /></ProtectRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
