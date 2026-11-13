import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectNeon, sql } from "./config/db.js";
import { ENV } from "./config/env.js";
import { cancelOverdueConfirmedAppointments } from "./services/appointmentScheduler.js";
import { authMiddleware, requireRole } from "./middlewares/auth.middleware.js";
import { createSiteGate, createSiteRoutes } from "./middlewares/siteGate.middleware.js";

import authRoute from "./routes/auth.route.js";
import midwifeRoute from "./routes/midwife.route.js";
import healthWorkerRoute from "./routes/healthworker.route.js";
import patientsRoute from "./routes/patients.route.js";
import appointmentsRoute from "./routes/appointments.route.js";
import patientPortalRoute from "./routes/patientportal.route.js";
import { mountPortalApi } from "./routes/portal.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const portal = process.env.APP_PORTAL || "patient";

app.use(
  cors({
    origin: ENV.CORS_ORIGINS,
  })
);

app.use(express.json());

// Setup links carry bearer secrets. Keep them out of referrers and caches,
// including when serving the built React app directly from Express.
app.use((req, res, next) => {
  if (req.path === "/confirm-account" || req.path.startsWith("/api/auth/")) {
    res.set({ "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" });
  }
  next();
});

// Staff portals hide behind STAFF_SITE_KEY (free-tier option B). The site
// routes stay public so browsers can unlock; the gate covers everything after
// them, including the portal APIs, health check, and the built frontend.
if (portal !== "patient" && ENV.NODE_ENV === "production" && !ENV.STAFF_SITE_KEY) {
  throw new Error("STAFF_SITE_KEY is required in production for staff portals.");
}
if (portal !== "patient" && !ENV.STAFF_SITE_KEY) {
  console.warn(`[server] STAFF_SITE_KEY not set; ${portal} site gate is open (development only).`);
}
app.use("/api/site", createSiteRoutes({ siteKey: ENV.STAFF_SITE_KEY, isProduction: ENV.NODE_ENV === "production" }));
app.use(createSiteGate({ portal, siteKey: ENV.STAFF_SITE_KEY }));

mountPortalApi(app, portal, { authRoute, patientPortalRoute, midwifeRoute, healthWorkerRoute, patientsRoute, appointmentsRoute, authMiddleware, requireRole });

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    centre: ENV.CENTRE_NAME,
  });
});

// Unknown API paths must never fall through to the SPA HTML handler.
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON request." });
  if (error.code === "23505") return res.status(409).json({ error: "That email address or account is already in use. Refresh and try again." });
  console.error("[server] Request failed:", error);
  res.status(500).json({ error: "An internal server error occurred." });
});

const frontendBuild = { patient: "dist", admin: "dist-admin", health_worker: "dist-health-worker" }[portal];
const frontendPath = path.join(__dirname, "../../frontend", frontendBuild);

app.use(express.static(frontendPath));

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

connectNeon()
  .then(async () => {
    if (portal === "admin") {
      let cancellationRunning = false;
      const cancelOverdueAppointments = async () => {
        if (cancellationRunning) return;
        cancellationRunning = true;
        try {
          const cancelled = await cancelOverdueConfirmedAppointments(sql);
          if (cancelled.length) {
            console.info(`[appointments] Automatically cancelled ${cancelled.length} overdue confirmed appointment(s).`);
          }
        } catch (error) {
          console.error("[appointments] Could not automatically cancel overdue appointments:", error);
        } finally {
          cancellationRunning = false;
        }
      };
      await cancelOverdueAppointments();
      const appointmentCancellationTimer = setInterval(() => {
        void cancelOverdueAppointments();
      }, 60_000);
      appointmentCancellationTimer.unref();
    }

    app.listen(ENV.PORT, ENV.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1", () => {
      console.log(
        `[server] HealthTrack ${portal} API listening on port ${ENV.PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("[server] Failed to connect to the database:", err);
    process.exit(1);
  });
