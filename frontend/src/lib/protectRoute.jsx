import { Navigate } from "react-router";
import { getCurrentUser, homeRouteForRole } from "./auth.js";


export function ProtectRoute({ roles, children }) {
  const user = getCurrentUser();

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeRouteForRole(user.role)} replace />;

  return <>{children}</>;
}
