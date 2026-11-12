import { useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getCurrentUser, roleLabel } from "../../../lib/auth";
import { LogoutButton } from "../../../components/ui/LogoutButton";

export function Header() {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    function syncUser() {
      setUser(getCurrentUser());
    }

    syncUser();
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncUser);
  }, []);

  return (
    <div className="ht-user-wrap">
      <div className="ht-user-meta">
        <div className="ht-user-name">{user?.name}</div>
        <div className="ht-user-role">{user ? roleLabel(user.role) : ""}</div>
      </div>
      <LogoutButton loginPath="/patient/login" />
    </div>
  );
}
