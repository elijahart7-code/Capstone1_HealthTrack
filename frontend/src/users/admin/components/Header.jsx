import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { clearSession, getCurrentUser, roleLabel } from "../../../lib/auth";

export function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="ht-user-wrap">
      <div className="ht-user-meta">
        <div className="ht-user-name">{user?.name}</div>
        <div className="ht-user-role">{user ? roleLabel(user.role) : ""}</div>
      </div>
      <button onClick={handleLogout} className="ht-header-logout">
        <LogOut size={18} strokeWidth={1.9} />
        Log out
      </button>
    </div>
  );
}
