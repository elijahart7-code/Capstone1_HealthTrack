import { getCurrentUser, roleLabel } from "../../../lib/auth";
import { LogoutButton } from "../../../components/ui/LogoutButton";
import { ChangePasswordButton } from "../../../auth/ChangePasswordDialog";

export function Header() {
  const user = getCurrentUser();

  return (
    <div className="ht-user-wrap">
      <div className="ht-user-meta">
        <div className="ht-user-name">{user?.name}</div>
        <div className="ht-user-role">{user ? roleLabel(user.role) : ""}</div>
      </div>
      <ChangePasswordButton />
      <LogoutButton loginPath="/admin/login" />
    </div>
  );
}
