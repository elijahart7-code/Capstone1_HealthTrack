// Register only the API surface belonging to this deployment. Origin/CORS
// headers are not used as proof of identity; protected routes still check JWTs.
export function mountPortalApi(app, portal, { authRoute, patientPortalRoute, midwifeRoute, healthWorkerRoute, patientsRoute, appointmentsRoute, authMiddleware, requireRole }) {
  if (!["patient", "staff"].includes(portal)) throw new Error("APP_PORTAL must be patient or staff.");

  app.use("/api/auth", (req, res, next) => {
    if (req.path === "/login") {
      const allowedRoles = portal === "staff" ? ["admin", "health_worker"] : ["patient"];
      if (!allowedRoles.includes(req.body?.accountType)) {
        return res.status(403).json({ error: "This account type cannot sign in on this website." });
      }
    }
    if (portal === "staff") {
      if (req.path === "/complete") return res.status(404).json({ error: "Not found." });
      // Staff can resend patient setup emails after signing in. The actual
      // confirmation and patient sign-in remain on the public patient site.
      if (req.path === "/initiate") {
        return authMiddleware(req, res, () => requireRole("admin", "health_worker")(req, res, next));
      }
    }
    next();
  }, authRoute);

  if (portal === "patient") {
    app.use("/api/patient", authMiddleware, requireRole("patient"), patientPortalRoute);
    return;
  }
  app.use("/api/admin", authMiddleware, requireRole("admin"), midwifeRoute);
  app.use("/api/health-worker", authMiddleware, requireRole("health_worker"), healthWorkerRoute);
  app.use("/api/patients", authMiddleware, requireRole("admin", "health_worker"), patientsRoute);
  app.use("/api/appointments", authMiddleware, requireRole("admin"), appointmentsRoute);
}
