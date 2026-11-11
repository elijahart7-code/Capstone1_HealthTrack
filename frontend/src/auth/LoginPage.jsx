import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
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
  const otpInput = useRef(null);
  const forgotPasswordCloseTimer = useRef(null);
  const transitioning = transitionPhase !== "idle";

  // Every patient sign-in requires a 6-digit email code after the password.
  const [stage, setStage] = useState("credentials");
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(0);

  useEffect(() => () => window.clearTimeout(forgotPasswordCloseTimer.current), []);

  useEffect(() => {
    if (stage !== "otp") return;
    otpInput.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (stage !== "otp" || resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, resendCooldown]);

  useEffect(() => {
    if (stage !== "otp" || expiresInSeconds <= 0) return;
    const timer = window.setTimeout(() => setExpiresInSeconds((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, expiresInSeconds]);

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

  function enterOtpStage(data) {
    setOtp("");
    setOtpError(null);
    setOtpMessage(data.message || "We sent a 6-digit sign-in code to your email.");
    setExpiresInSeconds(data.expiresInSeconds || 300);
    setResendCooldown(60);
    setStage("otp");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || transitioning) return;
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password, accountType });
      if (data.requires2FA) {
        enterOtpStage(data);
        return;
      }
      saveSession(data.token, data.user);
      navigate(homeRouteForRole(data.user.role));
    } catch (err) {
      setError(err?.response?.data?.error || "Incorrect email or password. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (otpLoading || resendLoading) return;
    setOtpError(null);
    const trimmed = otp.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await api.post("/auth/verify-2fa", { email, code: trimmed });
      saveSession(data.token, data.user);
      navigate(homeRouteForRole(data.user.role));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 429) {
        // Expired or locked: force a fresh password sign-in for a new code.
        setOtpError(err?.response?.data?.error || "This code is no longer valid. Please sign in again.");
      } else {
        setOtpError(err?.response?.data?.error || "That code is incorrect. Check your email and try again.");
      }
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResend() {
    if (resendLoading || otpLoading || resendCooldown > 0) return;
    setOtpError(null);
    setResendLoading(true);
    try {
      const { data } = await api.post("/auth/resend-2fa", { email });
      setOtpMessage(data.message || "A new sign-in code is on its way.");
      setExpiresInSeconds(300);
      setResendCooldown(60);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        setOtpError(err?.response?.data?.error || "No sign-in code is waiting. Please sign in again.");
      } else {
        setOtpError(err?.response?.data?.error || "We could not resend the code. Please try again.");
      }
      if (status === 429) setResendCooldown(60);
    } finally {
      setResendLoading(false);
    }
  }

  function backToCredentials() {
    setStage("credentials");
    setOtp("");
    setOtpError(null);
    setOtpMessage(null);
    setExpiresInSeconds(0);
    setResendCooldown(0);
  }

  const portal = {
    patient: { title: "Patient Portal", description: "Sign in to view your personal health records and appointments." },
    admin: { title: "Admin Portal", description: "Sign in to manage patient info, medical records, and appointments." },
    health_worker: { title: "Health Worker Portal", description: "Sign in to register patients and review patient health records." },
  }[accountType];

  const expiryLabel = expiresInSeconds > 0
    ? `Code expires in ${Math.floor(expiresInSeconds / 60)}:${String(expiresInSeconds % 60).padStart(2, "0")}`
    : "Code expired — sign in again for a new code";

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

            {stage === "credentials" ? (
              <>
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
              </>
            ) : (
              <>
                {otpMessage && <div role="status" className="ht-login-alert ht-login-alert-success">{otpMessage}</div>}
                {otpError && <div role="alert" className="ht-login-alert ht-login-alert-error">{otpError}</div>}

                <form onSubmit={handleOtpSubmit} className="ht-login-form">
                  <label className="ht-login-field">
                    <span>6-digit sign-in code</span>
                    <div className="ht-input-wrap">
                      <ShieldCheck aria-hidden="true" />
                      <input
                        ref={otpInput}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit code"
                        className="ht-input"
                      />
                    </div>
                  </label>

                  <p className="ht-muted text-sm" role="status">
                    Sent to {email}. {expiryLabel}.
                  </p>

                  <button type="submit" className="ht-button ht-auth-submit" disabled={otpLoading}>
                    <ShieldCheck size={20} strokeWidth={1.8} />
                    {otpLoading ? "Verifying..." : "Verify code & sign in"}
                  </button>

                  <button
                    type="button"
                    className="ht-login-link"
                    disabled={resendLoading || resendCooldown > 0}
                    onClick={handleResend}
                  >
                    {resendLoading
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                  <button type="button" className="ht-login-link" onClick={backToCredentials}>
                    Back to password sign in
                  </button>
                </form>
              </>
            )}
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
