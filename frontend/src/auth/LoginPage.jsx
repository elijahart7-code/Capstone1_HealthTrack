import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { homeRouteForRole, saveSession } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState("entering");
  const nextAccountType = useRef(null);
  const emailInput = useRef(null);
  const transitioning = transitionPhase !== "idle";

  useEffect(() => {
    if (transitionPhase === "idle") {
      if (accountType) emailInput.current?.focus({ preventScroll: true });
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (transitionPhase === "exiting") {
        setAccountType(nextAccountType.current);
        setError(null);
        setTransitionPhase("entering");
      } else {
        setTransitionPhase("idle");
      }
    }, reduceMotion ? 0 : transitionPhase === "exiting" ? 240 : 560);
    return () => window.clearTimeout(timer);
  }, [transitionPhase, accountType]);

  function changeAccountType(role) {
    if (loading || transitioning || role === accountType) return;
    nextAccountType.current = role;
    setTransitionPhase("exiting");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || transitioning) return;
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
    { key: "patient", label: "Patient", image: "/images/account-patient.png" },
    { key: "admin", label: "Admin", image: "/images/account-admin.png" },
    { key: "health_worker", label: "Health Worker", image: "/images/account-health-worker.png" },
  ];
  const portal = {
    patient: { title: "Patient Portal", description: "Sign in to view your personal health records and appointments." },
    admin: { title: "Admin Portal", description: "Sign in to manage patient info, medical records, and appointments." },
    health_worker: { title: "Health Worker Portal", description: "Sign in to register patients and review patient health records." },
  }[accountType];

  return (
    <div className="ht-auth-shell" data-portal={accountType || "welcome"} aria-busy={transitioning}>
      <div className="ht-auth-wrap" data-phase={transitionPhase} inert={transitioning}>
        <div className="ht-auth-branding">
          <div className="ht-login-brand">
            <div className="ht-login-logo-box">
              <img className="ht-login-logo" src="/images/healthtrack-symbol.png" alt="" />
            </div>
            <span className="ht-login-brand-name">HealthTrack</span>
          </div>
          <p className="ht-muted mt-2 text-sm">Barangay Health Center of Mambog I</p>
        </div>

        <div className="ht-auth-card">
          <div className="ht-login-panel">
            <div className="ht-login-header">
              <h1>{portal?.title || "Welcome to HealthTrack!"}</h1>
              <p>{portal?.description || "Sign in to access your account."}</p>
            </div>

            <div className="ht-login-divider" />

            <div className="ht-select-account">
              <p>{accountType ? "Selected Account!" : "Select your Account!"}</p>
              <div className={`ht-account-grid ${accountType ? "has-selection" : ""}`}>
                {accounts.map((account, index) => {
                  const selected = accountType === account.key;
                  const hidden = Boolean(accountType && !selected);
                  return (
                    <button
                      key={account.key}
                      type="button"
                      className={`ht-account-card ${selected ? "is-selected" : ""} ${hidden ? "is-hidden" : ""}`}
                      style={{ "--account-index": index }}
                      aria-pressed={selected}
                      aria-hidden={hidden}
                      tabIndex={hidden ? -1 : 0}
                      disabled={hidden || loading || transitioning}
                      onClick={() => changeAccountType(account.key)}
                    >
                      <span className="ht-account-icon-bg" aria-hidden="true">
                        <img className="ht-account-icon" src={account.image} alt="" />
                      </span>
                      <span>{account.label}</span>
                    </button>
                  );
                })}
              </div>
              {accountType && (
                <button
                  type="button"
                  className="ht-account-change"
                  disabled={loading || transitioning}
                  onClick={() => changeAccountType(null)}
                >
                  Change account type
                </button>
              )}
            </div>

            {error && <div className="ht-login-alert ht-login-alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="ht-login-form">
              <label className="ht-login-field">
                <span>Email Address</span>
                <div className="ht-input-wrap">
                  <Mail aria-hidden="true" />
                  <input
                    ref={emailInput}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                {loading ? "Signing In..." : portal ? `Sign In as ${accounts.find((account) => account.key === accountType).label}` : "Sign In"}
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
