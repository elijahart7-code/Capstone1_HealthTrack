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

// Mount /api/site BEFORE this gate; unlock/status are handled there and never
// reach it. Everything after this middleware is hidden without the key.
export function createSiteGate({ portal, siteKey }) {
  if (portal === "patient" || !siteKey) return (_req, _res, next) => next();
  return (req, res, next) => {
    if (hasSiteAccess(req, siteKey)) return next();
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
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
