import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "../lib/axios";
import { homeRouteForRole, saveSession } from "../lib/auth";

function SetupLayout({ title, description, children }) {
  return (
    <div className="ht-auth-shell">
      <div className="ht-auth-wrap">
        <div className="ht-auth-branding">
          <div className="ht-brand justify-center"><span className="ht-brand-mark">HT</span><span>HealthTrack</span></div>
          <p className="ht-muted mt-2 text-sm">Your patient portal</p>
        </div>
        <div className="ht-auth-card">
          <div className="ht-login-panel">
            <div className="ht-login-header"><h1>{title}</h1><p>{description}</p></div>
            <div className="ht-login-divider" />
            {children}
            <Link className="ht-login-link ht-setup-back" to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RequestAccountSetupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const { data } = await api.post("/auth/initiate", { email });
      setMessage(data.message);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not request your setup link. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <SetupLayout title="Set up your account" description="Enter the email your health center used to register you.">
      <p className="ht-muted text-sm">For patients already registered by health center staff. If your account is active, use the sign-in page.</p>
      {message && <p className="ht-login-alert" role="status">{message}</p>}
      {error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
      <form className="ht-login-form" onSubmit={submit}>
        <label className="ht-login-field"><span>Email Address</span>
          <input className="ht-input" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="ht-button ht-auth-submit" disabled={loading}>{loading ? "Sending..." : "Send setup link"}</button>
      </form>
    </SetupLayout>
  );
}

export function ConfirmAccountPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const validToken = /^[a-f0-9]{64}$/.test(token) && !invalid;

  async function submit(event) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Your passwords do not match."); return; }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Use at least 12 characters and no more than 72 UTF-8 bytes for your password."); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/complete", { token, new_password: password });
      saveSession(data.token, data.user);
      navigate(homeRouteForRole(data.user.role), { replace: true });
    } catch (err) {
      if (err?.response?.status === 400) setInvalid(true);
      setError(err?.response?.data?.error || "Could not finish account setup. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <SetupLayout title="Welcome to HealthTrack" description="Confirm your email and choose your password to get started.">
      {error && <p className="ht-login-alert ht-login-alert-error" role="alert">{error}</p>}
      {!validToken ? (
        <div>
          {!error && <p role="alert">This setup link is missing or invalid. Request a new email to continue.</p>}
          <Link className="ht-button ht-auth-submit" to="/setup-account">Request a new setup link</Link>
        </div>
      ) : (
        <form className="ht-login-form" onSubmit={submit}>
          <p className="ht-muted text-sm">Your email is confirmed only when you save your password. Setup links expire after 15 minutes.</p>
          <label className="ht-login-field"><span>New Password</span>
            <input className="ht-input" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={72} aria-describedby="password-guidance" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <p id="password-guidance" className="ht-muted text-sm">Use at least 12 characters. A long, memorable passphrase works well.</p>
          <label className="ht-login-field"><span>Confirm Password</span>
            <input className="ht-input" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <label className="ht-setup-show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show passwords</label>
          <button className="ht-button ht-auth-submit" disabled={loading}>{loading ? "Setting up..." : "Confirm email & save password"}</button>
        </form>
      )}
    </SetupLayout>
  );
}
