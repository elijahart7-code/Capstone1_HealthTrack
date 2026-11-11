import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

// Staff-only gate for the free-tier site key (option B). The backend answers
// 404 for /api/site/* on portals without the gate (patient), so this renders
// its children immediately there. On staff portals it blocks the login and
// dashboard routes until the shared key unlocks the ht_site cookie.
export default function SiteKeyGate({ children }) {
  const [state, setState] = useState("checking");
  const [siteKey, setSiteKey] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/status", { credentials: "same-origin" })
      .then((res) => {
        if (cancelled) return null;
        if (res.status === 404) return { locked: false };
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setState(data.locked ? "locked" : "open");
      })
      .catch(() => {
        if (!cancelled) setState("locked");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The key is only ever hashed and compared server-side; it is never
  // rendered, logged, or interpolated into any query or command.
  async function unlock(keyValue) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/site/unlock", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyValue }),
      });
      if (res.ok) {
        setSiteKey("");
        setState("open");
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Too many key attempts. Try again in 15 minutes.");
        return;
      }
      setError("That key is incorrect.");
    } catch {
      setError("The server could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || !siteKey) return;
    await unlock(siteKey);
  }

  if (state === "open") return children;

  if (state === "checking") {
    return (
      <div className="ht-auth-page">
        <div className="ht-auth-card" role="status">
          <p>Checking access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ht-auth-page">
      <form className="ht-auth-card" onSubmit={handleSubmit}>
        <div className="ht-auth-header">
          <ShieldCheck size={28} aria-hidden="true" />
          <h1>Restricted area</h1>
          <p>This staff portal requires an access key before sign-in.</p>
        </div>
        {error && (
          <div role="alert" className="ht-login-alert ht-login-alert-error">
            {error}
          </div>
        )}
        <label className="ht-field">
          <span>Access key</span>
          <input
            type="password"
            value={siteKey}
            onChange={(e) => setSiteKey(e.target.value)}
            placeholder="Enter the staff access key"
            autoComplete="off"
            autoFocus
          />
        </label>
        <button type="submit" className="ht-button ht-auth-submit" disabled={loading || !siteKey}>
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
