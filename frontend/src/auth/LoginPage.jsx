import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { homeRouteForRole, saveSession } from "../lib/auth";

function AccountRoleIcon({ role }) {
  if (role === "patient") {
    return (
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="8" r="4.2" />
        <path d="M4.5 26v-1.4c0-6 4.5-10.1 10.5-10.1s10.5 4.1 10.5 10.1V26" />
      </svg>
    );
  }

  if (role === "admin") {
    return (
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <path d="M11.3 6V4.8c0-2.2 1.4-3.6 3.7-3.6s3.7 1.4 3.7 3.6V6" />
        <path d="M10.5 6h9l-1 2.1h-7z" />
        <path d="M10.7 10c0-2.7 1.6-4.2 4.3-4.2s4.3 1.5 4.3 4.2v2.8c0 3.3-1.8 5.3-4.3 5.3s-4.3-2-4.3-5.3z" />
        <path d="m10.5 17.5-3 1.1c-3.2 1.2-5 4.4-5.5 7.8L1.8 29h26.4l-.2-2.6c-.5-3.4-2.3-6.6-5.5-7.8l-3-1.1-5 5z" />
        <path d="m11.5 18.5 3.5 4 3.5-4M8 20v4c0 2 1 3 2.5 3m11.5-7v4c0 1.2-.5 2.2-1.5 2.7" />
        <path d="M23.5 21v4m-2-2h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 30 30" aria-hidden="true">
      <path d="M11 10c0-4.2 1.6-6.8 4-6.8s4 2.6 4 6.8v3c0 3.2-1.6 5.4-4 5.4s-4-2.2-4-5.4z" />
      <path d="M11.1 10.5c2.8.4 5.8.3 7.8-1.1" />
      <path d="m11 18-3 1c-3.8 1.2-5.7 4.3-6.2 8.5L1.5 29h27l-.3-1.5c-.5-4.2-2.4-7.3-6.2-8.5l-3-1-3 2-3-2z" />
      <path d="M23 21v4m-2-2h4M7 24v4" />
    </svg>
  );
}

/**
 * Login screen for the app. The selected account type is sent to the backend
 * and must match the role assigned to the submitted account.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
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