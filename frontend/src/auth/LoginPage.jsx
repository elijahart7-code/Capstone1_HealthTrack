import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { homeRouteForRole, saveSession } from "../lib/auth";

function AccountRoleIcon({ role }) {
  if (role === "patient") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M21 19c0-9 4-15 11-15s11 6 11 15v7c0 10-5 16-11 16s-11-6-11-16z" />
        <path d="M21 20c5 0 10-2 15-7 2 4 4 6 7 7M10 61v-4c0-8 5-13 13-15l9 6 9-6c8 2 13 7 13 15v4" />
        <path d="M32 50c-3-4-8 0-4 4l4 4 4-4c4-4-1-8-4-4z" />
      </svg>
    );
  }

  if (role === "admin") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M20 15V9c0-4 5-6 12-6s12 2 12 6v6l-5-2H25z" />
        <path d="M32 6v8m-4-4h8" />
        <path d="M22 17c0-7 4-11 10-11s10 4 10 11v9c0 9-4 14-10 14s-10-5-10-14z" />
        <path d="M18 24h4m20 0h4M12 61l2-13c1-6 5-9 12-11l6 7 6-7c7 2 11 5 12 11l2 13H12z" />
        <path d="m25 39 7 9 7-9M20 43v11m24-11v11M46 48v7m-3.5-3.5h7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="14" cy="20" r="7" />
      <circle cx="32" cy="15" r="9" />
      <circle cx="50" cy="20" r="7" />
      <path d="M6 31c-3 1-5 4-5 8v6h14M58 31c3 1 5 4 5 8v6H49M23 30c-5 2-8 6-8 12v7h34v-7c0-6-3-10-8-12" />
      <path d="M28 5V2m-4 3h8M32 37v9m-4.5-4.5h9" />
    </svg>
  );
}

/**
 * Login screen for the app. The selected account type is sent to the backend
 * and must match the role assigned to the submitted account.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!accountType) {
      setError("Select your account type to continue.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password, accountType });
      saveSession(data.token, data.user);
      navigate(homeRouteForRole(data.user.role));
    } catch (err) {
      setError(err?.response?.data?.error || "Incorrect email or password. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  const accounts = [
    { key: "patient", label: "Patient", icon: "patient" },
    { key: "admin", label: "Admin", icon: "admin" },
    { key: "health_worker", label: "Health Worker", icon: "health_worker" },
  ];

  return (
    <div className="ht-auth-shell">
      <div className="ht-auth-wrap">
        <div className="ht-auth-branding">
          <div className="ht-brand justify-center">
            <span className="ht-brand-mark">HT</span>
            <span>HealthTrack</span>
          </div>
          <p className="ht-muted mt-2 text-sm">Barangay Health Center of Mambog I</p>
        </div>

        <div className="ht-auth-card">
          <div className="ht-login-panel">
            <div className="ht-login-header">
              <h1>Welcome to HealthTrack</h1>
              <p>Sign in to access your account.</p>
            </div>

            <div className="ht-login-divider" />

            <div className="ht-select-account">
              <p>Select your account type</p>
              <div className="ht-account-grid">
                {accounts.map((account) => {
                  const selected = accountType === account.key;
                  return (
                    <button
                      key={account.key}
                      type="button"
                      className={`ht-account-card ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => setAccountType(account.key)}
                    >
                      <span className="ht-account-icon" aria-hidden="true">
                        <AccountRoleIcon role={account.icon} />
                      </span>
                      <span>{account.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <div className="ht-login-alert ht-login-alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="ht-login-form">
              <label className="ht-login-field">
                <span>Email Address</span>
                <div className="ht-input-wrap">
                  <Mail aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Enter your email address"
                    className="ht-input"
                  />
                </div>
              </label>

              <label className="ht-login-field">
                <span>Password</span>
                <div className="ht-input-wrap">
                  <Lock aria-hidden="true" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="ht-input ht-password-input"
                  />
                  <button
                    type="button"
                    className="ht-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={1.8} /> : <Eye size={20} strokeWidth={1.8} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="ht-button ht-auth-submit" disabled={loading}>
                <LogIn size={20} strokeWidth={1.8} />
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <button
                type="button"
                className="ht-login-link"
                onClick={() => alert("Contact your admin or health worker to reset your password.")}
              >
                Forgot your password?
              </button>
            </form>
          </div>
        </div>

        <div className="ht-auth-footer">© 2026 HealthTrack. All rights reserved.</div>
      </div>
    </div>
  );
}