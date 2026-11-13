import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ChangePasswordButton } from "../../auth/ChangePasswordDialog";
import { AUTH_CHANGED_EVENT, getCurrentUser, roleLabel } from "../../lib/auth";
import { LogoutButton } from "./LogoutButton";

export function UserAccountMenu({ loginPath }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function syncUser() {
      setUser(getCurrentUser());
    }

    syncUser();
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    if (!isProfileOpen && !isMenuOpen) return undefined;

    function closePopovers(event) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsMenuOpen(false);
      }
    }

    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsProfileOpen(false);
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closePopovers);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closePopovers);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isProfileOpen, isMenuOpen]);

  const nameParts = user?.name?.trim().split(/\s+/).filter(Boolean) || [];
  const firstName = nameParts[0] || "Account";
  const profileDisplayName = user?.role === "health_worker" ? "Health Worker" : firstName;
  const nameInitials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts.at(-1)[0]}`.toUpperCase()
    : nameParts[0]?.[0]?.toUpperCase() || "A";
  const initials = user?.role === "health_worker"
    ? "HW"
    : user?.role === "admin"
      ? "AD"
      : nameInitials;
  const userRole = user ? roleLabel(user.role) : "";

  return (
    <div className="ht-user-wrap ht-account-wrap" ref={menuRef}>
      <div className="ht-user-meta ht-account-desktop-meta">
        <div className="ht-user-name">{user?.name}</div>
        <div className="ht-user-role">{userRole}</div>
      </div>

      <div className="ht-account-identity">
        <button
          type="button"
          className="ht-account-profile-trigger"
          aria-expanded={isProfileOpen}
          aria-controls="ht-account-profile-popover"
          onClick={() => {
            setIsProfileOpen((open) => !open);
            setIsMenuOpen(false);
          }}
        >
          <span className="ht-account-profile-initials" aria-hidden="true">{initials}</span>
          <span className="ht-account-profile-first-name">{profileDisplayName}</span>
        </button>
        {isProfileOpen && (
          <div className="ht-account-profile-popover" id="ht-account-profile-popover">
            <strong>{user?.name || "Account"}</strong>
            {userRole && <span>{userRole}</span>}
          </div>
        )}
      </div>

      <button
        type="button"
        className="ht-account-menu-toggle"
        aria-label={isMenuOpen ? "Close account menu" : "Open account menu"}
        aria-expanded={isMenuOpen}
        aria-controls="ht-account-panel"
        onClick={() => {
          setIsMenuOpen((open) => !open);
          setIsProfileOpen(false);
        }}
      >
        <Menu size={25} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className={`ht-account-panel${isMenuOpen ? " is-open" : ""}`} id="ht-account-panel">
        <div className="ht-account-actions">
          <ChangePasswordButton />
          <LogoutButton loginPath={loginPath} />
        </div>
      </div>
    </div>
  );
}