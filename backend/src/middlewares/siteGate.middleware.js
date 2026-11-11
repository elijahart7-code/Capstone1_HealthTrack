import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";

// Free-tier staff-portal gate (option B). Render Free cannot hide the Admin and
// Health Worker services at the network layer, so each staff service requires a
// shared STAFF_SITE_KEY before serving any page or API. The Patient portal is
// public and never gated. Wrong keys answer 404 so scanners learn nothing.
export const SITE_COOKIE = "ht_site";
export const SITE_COOKIE_MAX_AGE = 12 * 3600; // 12 hours

const sha256 = (value) => createHash("sha256").update(value).digest();

// Hash both sides so timingSafeEqual never throws on length mismatch.
export function keysEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (!provided || !expected) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

// The cookie holds a derived token, never the key itself.
export function siteToken(siteKey) {
  return createHash("sha256").update(`${siteKey}|healthtrack-site-unlock`).digest("hex");
}

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== "string" || !header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

export function hasSiteAccess(req, siteKey) {
  if (!siteKey) return false;
  const headerKey = req.headers["x-site-key"];
  if (typeof headerKey === "string" && headerKey && keysEqual(headerKey, siteKey)) return true;
  const token = parseCookies(req.headers.cookie)[SITE_COOKIE];
  return typeof token === "string" && !!token && keysEqual(token, siteToken(siteKey));
}

// Locked browsers cannot load the React app (it sits behind this same
// gate), so locked page visits get a self-contained unlock page instead.
// It carries no key material and posts to /api/site/unlock, which stays
// rate-limited. APIs keep answering 404 while locked.
const UNLOCK_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Restricted area</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#f2faf6;color:#073b2a;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center}
main{background:#fff;border-radius:12px;padding:32px;max-width:400px;width:calc(100% - 32px);box-shadow:0 4px 24px rgba(7,59,42,.12)}
h1{font-size:22px;margin:0 0 8px}p{margin:0 0 16px;color:#475569;font-size:14px}
label{display:block;font-size:14px;margin-bottom:12px}input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-top:6px}
button{background:#16a34a;color:#fff;border:0;border-radius:8px;padding:12px;width:100%;font-weight:bold;cursor:pointer}
#error{color:#b91c1c;font-size:14px;min-height:20px;margin:0 0 8px}</style>
</head><body><main>
<h1>Restricted area</h1>
<p>This staff portal requires an access key before sign-in.</p>
<p id="error" role="alert"></p>
<form id="gate"><label>Access key<input id="key" type="password" autocomplete="off" autofocus></label>
<button type="submit" id="go">Unlock</button></form>
<script>document.getElementById("gate").addEventListener("submit",async function(e){e.preventDefault();
var go=document.getElementById("go"),err=document.getElementById("error");go.disabled=true;err.textContent="";
try{var res=await fetch("/api/site/unlock",{method:"POST",credentials:"same-origin",
headers:{"Content-Type":"application/json"},body:JSON.stringify({key:document.getElementById("key").value})});
if(res.ok){location.reload();return;}
if(res.status===429){try{err.textContent=(await res.json()).error;}catch(_){err.textContent="Too many key attempts. Try again in 15 minutes."};}
else{err.textContent="That key is incorrect.";}}catch(_){err.textContent="The server could not be reached. Try again.";}
go.disabled=false;});</script>
</main></body></html>`;

// Mount /api/site BEFORE this gate; unlock/status are handled there and never
// reach it. Everything after this middleware is hidden without the key.
export function createSiteGate({ portal, siteKey }) {
  if (portal === "patient" || !siteKey) return (_req, _res, next) => next();
  return (req, res, next) => {
    if (hasSiteAccess(req, siteKey)) return next();
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
    if (req.method === "GET" || req.method === "HEAD") {
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/html; charset=utf-8" });
      return res.status(200).send(UNLOCK_PAGE);
    }
    return res.status(404).send("Not found.");
  };
}

export function createSiteRoutes({ siteKey, isProduction }) {
  const router = Router();

  router.get("/status", (_req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    if (!siteKey) return res.json({ locked: false });
    return res.json({ locked: !hasSiteAccess(_req, siteKey) });
  });

  router.post(
    "/unlock",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many key attempts. Try again in 15 minutes." },
    }),
    (req, res) => {
      res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
      const key = req.body?.key;
      // Reject oversized input before hashing. The key is only hashed and
      // compared; it never reaches a query, shell, or rendered page.
      if (!siteKey || typeof key !== "string" || !key || key.length > 4096 || !keysEqual(key, siteKey)) {
        return res.status(404).json({ error: "Not found." });
      }
      const attrs = [
        `${SITE_COOKIE}=${siteToken(siteKey)}`,
        "Path=/",
        `Max-Age=${SITE_COOKIE_MAX_AGE}`,
        "HttpOnly",
        "SameSite=Lax",
      ];
      if (isProduction) attrs.push("Secure");
      res.set("Set-Cookie", attrs.join("; "));
      return res.json({ ok: true });
    }
  );

  return router;
}
