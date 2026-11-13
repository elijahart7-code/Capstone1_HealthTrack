import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { api } from "../lib/axios";

// Shared "Change my password" dialog for all three portals. The session JWT
// stays valid until expiry; the new password gates the next sign-in.
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ht-header-logout" onClick={() => setOpen(true)}>
        <KeyRound size={18} strokeWidth={1.9} />
        Change password
      </button>
      {open && <ChangePasswordDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function ChangePasswordDialog({ onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function closeDialog() {
    if (isClosing) return;
    setIsClosing(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(onClose, reduceMotion ? 0 : 220);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/change-password", { current_password: current, new_password: next });
      setDone(data.message || "Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err.response?.data?.error || "The password could not be changed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`ht-confirm-backdrop ht-archive-confirm-backdrop ${isClosing ? "is-closing" : ""}`} role="dialog" aria-label="Change password">
      <form className={`ht-confirm-dialog ht-archive-confirm-dialog ht-change-password-dialog ${isClosing ? "is-closing" : ""}`} onSubmit={handleSubmit}>
        <h2>Change Password</h2>
        <p className="ht-muted">Use at least 12 characters. Other signed-in sessions stay valid until they expire. Thank you!</p>
        {error && <div role="alert" className="ht-login-alert ht-login-alert-error">{error}</div>}
        {done && <div role="status" className="ht-login-alert ht-login-alert-success">{done}</div>}
        <label className="ht-field">
          <span>Current Password</span>
          <div className="ht-change-password-input-wrap">
            <input className="ht-input ht-password-input" type={visiblePasswords.current ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            <button type="button" className="ht-password-toggle" aria-label={visiblePasswords.current ? "Hide current password" : "Show current password"} aria-pressed={visiblePasswords.current} onClick={() => setVisiblePasswords(value => ({ ...value, current: !value.current }))}>
              {visiblePasswords.current ? <EyeOff size={20} strokeWidth={1.8} /> : <Eye size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </label>
        <label className="ht-field">
          <span>New Password</span>
          <div className="ht-change-password-input-wrap">
            <input className="ht-input ht-password-input" type={visiblePasswords.next ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <button type="button" className="ht-password-toggle" aria-label={visiblePasswords.next ? "Hide new password" : "Show new password"} aria-pressed={visiblePasswords.next} onClick={() => setVisiblePasswords(value => ({ ...value, next: !value.next }))}>
              {visiblePasswords.next ? <EyeOff size={20} strokeWidth={1.8} /> : <Eye size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </label>
        <label className="ht-field">
          <span>Confirm New Password</span>
          <div className="ht-change-password-input-wrap">
            <input className="ht-input ht-password-input" type={visiblePasswords.confirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <button type="button" className="ht-password-toggle" aria-label={visiblePasswords.confirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={visiblePasswords.confirm} onClick={() => setVisiblePasswords(value => ({ ...value, confirm: !value.confirm }))}>
              {visiblePasswords.confirm ? <EyeOff size={20} strokeWidth={1.8} /> : <Eye size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </label>
        <div className="ht-confirm-actions">
          <button type="submit" className="ht-button ht-auth-submit" disabled={loading || !current || !next || !confirm}>
            {loading ? "Saving…" : "Save new password"}
          </button>
          <button type="button" className="ht-button ht-change-password-close" onClick={closeDialog}>Close</button>
        </div>
      </form>
    </div>
  );
}
