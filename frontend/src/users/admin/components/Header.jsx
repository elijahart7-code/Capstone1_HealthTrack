import { getCurrentUser, roleLabel } from "../../../lib/auth";
import { LogoutButton } from "../../../components/ui/LogoutButton";

export function Header() {
  const user = getCurrentUser();

  return (
    <div className="ht-user-wrap">
      <div className="ht-user-meta">
        <div className="ht-user-name">{user?.name}</div>
        <div className="ht-user-role">{user ? roleLabel(user.role) : ""}</div>
      </div>
      <LogoutButton loginPath="/admin/login" />
    </div>
  );
}
