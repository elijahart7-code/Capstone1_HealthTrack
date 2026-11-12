import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { clearSession } from "../../lib/auth";

export function LogoutButton({ loginPath }) {
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!isConfirming) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") closeConfirmation();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirming]);

  function openConfirmation() {
    window.clearTimeout(closeTimer.current);
    setIsClosing(false);
    setIsConfirming(true);
  }

  function closeConfirmation() {
    if (isClosing) return;
    setIsClosing(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(() => {
      setIsConfirming(false);
      setIsClosing(false);
    }, reduceMotion ? 0 : 220);
  }

  function confirmLogout() {
    window.clearTimeout(closeTimer.current);
    clearSession();
    navigate(loginPath, { replace: true });
  }

  return (
    <>
      <button type="button" onClick={openConfirmation} className="ht-header-logout">
        <LogOut size={18} strokeWidth={1.9} />
        Log out
      </button>
      {isConfirming && (
        <div
          className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosing ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirmation();
          }}
        >
          <section
            aria-labelledby="logout-confirm-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-archive-confirm-dialog ${isClosing ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="logout-confirm-title">Confirm Logout</h2>
            <p className="ht-confirm-message">Are you sure you want to logout?</p>
            <div className="ht-confirm-actions ht-archive-confirm-actions ht-logout-confirm-actions">
              <button
                className="ht-confirm-submit ht-logout-confirm-yes"
                onClick={confirmLogout}
                type="button"
              >
                Yes
              </button>
              <button
                className="ht-confirm-cancel ht-logout-confirm-no"
                onClick={closeConfirmation}
                type="button"
              >
                No
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
