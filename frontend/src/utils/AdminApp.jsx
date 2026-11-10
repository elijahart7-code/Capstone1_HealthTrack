import { Navigate, Route, Routes } from "react-router";
import LoginPage from "../auth/LoginPage";
import { ProtectRoute } from "../lib/protectRoute";
import { getCurrentUser } from "../lib/auth";
import { AdminShell } from "../users/admin/AdminShell";
import NotFoundPage from "./NotFoundPage";

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={getCurrentUser()?.role === "admin" ? "/admin" : "/admin/login"} replace />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage accountType="admin" />} />
      <Route path="/admin" element={<ProtectRoute roles={["admin"]}><AdminShell /></ProtectRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
