import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "../lib/axios";
import { homeRouteForRole, roleLabel, saveSession } from "../lib/auth";

export default function LoginPage({ accountType = "patient" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordMessage, setShowForgotPasswordMessage] = useState(false);
  const [isClosingForgotPasswordMessage, setIsClosingForgotPasswordMessage] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState("entering");
  const emailInput = useRef(null);
  const forgotPasswordCloseTimer = useRef(null);
  const transitioning = transitionPhase !== "idle";

  useEffect(() => () => window.clearTimeout(forgotPasswordCloseTimer.current), []);

  function openForgotPasswordMessage() {
    window.clearTimeout(forgotPasswordCloseTimer.current);
    setIsClosingForgotPasswordMessage(false);
    setShowForgotPasswordMessage(true);
  }

  function closeForgotPasswordMessage() {
    if (isClosingForgotPasswordMessage) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsClosingForgotPasswordMessage(true);
    forgotPasswordCloseTimer.current = window.setTimeout(() => {
      setShowForgotPasswordMessage(false);
      setIsClosingForgotPasswordMessage(false);
    }, reduceMotion ? 0 : 220);
  }

  useEffect(() => {
    if (transitionPhase === "idle") {
      if (accountType) emailInput.current?.focus({ preventScroll: true });
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setTransitionPhase("idle");
    }, reduceMotion ? 0 : 560);
    return () => window.clearTimeout(timer);
  }, [transitionPhase, accountType]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || transitioning) return;
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

  const portal = {
    patient: { title: "Patient Portal", description: "Sign in to view your personal health records and appointments." },
    admin: { title: "Admin Portal", description: "Sign in to manage patient info, medical records, and appointments." },
    health_worker: { title: "Health Worker Portal", description: "Sign in to register patients and review patient health records." },
  }[accountType];

  return (
    <div className="ht-auth-shell" data-portal={accountType} aria-busy={transitioning}>
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
              <h1>{portal.title}</h1>
              <p>{portal.description}</p>
            </div>

            <div className="ht-login-divider" />

            {error && <div role="alert" className="ht-login-alert ht-login-alert-error">{error}</div>}

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
                {loading ? "Signing In..." : `Sign In as ${roleLabel(accountType)}`}
              </button>

              <button
                type="button"
                className="ht-login-link"
                onClick={openForgotPasswordMessage}
              >
                Forgot your password?
              </button>
            </form>
          </div>
        </div>

        <div className="ht-auth-footer">© 2026 HealthTrack. All rights reserved.</div>
      </div>
      {showForgotPasswordMessage && (
        <div
          className={`ht-confirm-backdrop ht-login-confirm-backdrop ${isClosingForgotPasswordMessage ? "is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isClosingForgotPasswordMessage) {
              closeForgotPasswordMessage();
            }
          }}
        >
          <section
            aria-labelledby="forgot-password-title"
            aria-modal="true"
            className={`ht-confirm-dialog ht-login-confirm-dialog ${isClosingForgotPasswordMessage ? "is-closing" : ""}`}
            role="dialog"
          >
            <h2 id="forgot-password-title">Forgot Password?</h2>
            <p>Please contact the barangay admin or health worker to reset your password. Thanks for using HealthTrack!</p>
            <div className="ht-confirm-actions ht-login-confirm-actions">
              <button
                autoFocus
                className="ht-confirm-submit"
                onClick={closeForgotPasswordMessage}
                type="button"
              >
                Exit
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
