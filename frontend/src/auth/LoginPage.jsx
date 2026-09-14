import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, User, UserRoundCog, Users, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { homeRouteForRole, saveSession } from "../lib/auth";

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
    { key: "patient", label: "Patient", icon: User },
    { key: "admin", label: "Admin", icon: UserRoundCog },
    { key: "health_worker", label: "HealthWorker", icon: Users },
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
                  const Icon = account.icon;
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
                        <Icon size={30} strokeWidth={1.7} />
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