import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectNeon } from "./config/db.js";
import { ENV } from "./config/env.js";
import { authMiddleware, requireRole } from "./middlewares/auth.middleware.js";

import authRoute from "./routes/auth.route.js";
import midwifeRoute from "./routes/midwife.route.js";
import healthWorkerRoute from "./routes/healthworker.route.js";
import patientsRoute from "./routes/patients.route.js";
import appointmentsRoute from "./routes/appointments.route.js";
import patientPortalRoute from "./routes/patientportal.route.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

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

app.use("/api/auth", authRoute);

app.use(
  "/api/admin",
  authMiddleware,
  requireRole("admin"),
  midwifeRoute
);

app.use(
  "/api/health-worker",
  authMiddleware,
  requireRole("health_worker"),
  healthWorkerRoute
);

app.use(
  "/api/patients",
  authMiddleware,
  requireRole("admin", "health_worker"),
  patientsRoute
);

app.use(
  "/api/appointments",
  authMiddleware,
  requireRole("admin"),
  appointmentsRoute
);

app.use(
  "/api/patient",
  authMiddleware,
  requireRole("patient"),
  patientPortalRoute
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    centre: ENV.CENTRE_NAME,
  });
});

app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON request." });
  if (error.code === "23505") return res.status(409).json({ error: "That email address or account is already in use. Refresh and try again." });
  console.error("[server] Request failed:", error);
  res.status(500).json({ error: "An internal server error occurred." });
});

const frontendPath = path.join(__dirname, "../../frontend/dist");

app.use(express.static(frontendPath));

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

connectNeon()
  .then(() => {
    app.listen(ENV.PORT, () => {
      console.log(
        `[server] HealthTrack API listening on port ${ENV.PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("[server] Failed to connect to the database:", err);
    process.exit(1);
  });
