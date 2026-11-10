// Register only the API surface belonging to this deployment. Origin/CORS
// headers are not used as proof of identity; protected routes still check JWTs.
export function mountPortalApi(app, portal, { authRoute, patientPortalRoute, midwifeRoute, healthWorkerRoute, patientsRoute, appointmentsRoute, authMiddleware, requireRole }) {
  if (!["patient", "admin", "health_worker"].includes(portal)) throw new Error("APP_PORTAL must be patient, admin, or health_worker.");

  app.use("/api/auth", (req, res, next) => {
    if (req.path === "/login") {
      if (req.body?.accountType !== portal) {
        return res.status(403).json({ error: "This account type cannot sign in on this website." });
      }
    }
    if (portal !== "patient") {
      if (req.path === "/complete") return res.status(404).json({ error: "Not found." });
      // Staff can resend patient setup emails after signing in. The actual
      // confirmation and patient sign-in remain on the public patient site.
      if (req.path === "/initiate") {
        return authMiddleware(req, res, () => requireRole(portal)(req, res, next));
      }
    }
    next();
  }, authRoute);

  if (portal === "patient") {
    app.use("/api/patient", authMiddleware, requireRole("patient"), patientPortalRoute);
    return;
  }
  if (portal === "admin") {
    app.use("/api/admin", authMiddleware, requireRole("admin"), midwifeRoute);
    app.use("/api/appointments", authMiddleware, requireRole("admin"), appointmentsRoute);
  } else {
    app.use("/api/health-worker", authMiddleware, requireRole("health_worker"), healthWorkerRoute);
  }
  app.use("/api/patients", authMiddleware, requireRole(portal), patientsRoute);
}
