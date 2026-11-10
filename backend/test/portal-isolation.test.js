import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import express from "express";
import jwt from "jsonwebtoken";
import { mountPortalApi } from "../src/routes/portal.routes.js";

const secret = "isolated-portal-test-secret";
const users = new Map(["patient", "admin", "worker1", "worker2"].map(id => [id, {
  user_id: id, role: id.startsWith("worker") ? "health_worker" : id,
}]));
const source = (await readFile(new URL("../src/middlewares/auth.middleware.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const { authMiddleware, requireRole } = vm.runInNewContext(`${source};({authMiddleware, requireRole})`, {
  jwt, ENV: { JWT_SECRET: secret },
  sql: async (_strings, id) => users.has(id) ? [users.get(id)] : [],
});

for (const portal of ["patient", "admin", "health_worker"]) {
  test(`${portal} server exposes only its own API and enforces identity and role`, async () => {
    const app = express(); app.use(express.json());
    const router = () => express.Router().get("/", (req, res) => res.json({ role: req.user.role }));
    const authRoute = express.Router();
    for (const path of ["/login", "/initiate", "/complete"]) authRoute.post(path, (_req, res) => res.json({ ok: true }));
    mountPortalApi(app, portal, {
      authRoute, patientPortalRoute: router(), midwifeRoute: router(), healthWorkerRoute: router(),
      patientsRoute: router(), appointmentsRoute: router(), authMiddleware, requireRole,
    });
    app.use((_req, res) => res.status(404).json({ error: "Not found." }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const get = (path, id) => fetch(base + path, { headers: id ? { Authorization: `Bearer ${jwt.sign({ user_id: id }, secret)}` } : {} });
    const post = (path, role, id) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(id ? { Authorization: `Bearer ${jwt.sign({ user_id: id }, secret)}` } : {}) }, body: JSON.stringify({ accountType: role }) });
    try {
      for (const role of ["patient", "admin", "health_worker"]) {
        assert.equal((await post("/api/auth/login", role)).status, portal === role ? 200 : 403);
      }
      const allowed = {
        patient: ["/api/patient"], admin: ["/api/admin", "/api/patients", "/api/appointments"],
        health_worker: ["/api/health-worker", "/api/patients"],
      }[portal];
      for (const path of ["/api/patient", "/api/admin", "/api/health-worker", "/api/patients", "/api/appointments"]) {
        for (const id of [undefined, "patient", "admin", "worker1", "worker2"]) {
          const expected = !allowed.includes(path) ? 404 : !id ? 401 : users.get(id).role === portal ? 200 : 403;
          assert.equal((await get(path, id)).status, expected, `${portal} ${path} ${id}`);
        }
      }
      if (portal !== "patient") {
        assert.equal((await post("/api/auth/complete", "patient")).status, 404);
        assert.equal((await post("/api/auth/initiate", "patient")).status, 401);
        assert.equal((await post("/api/auth/initiate", "patient", "patient")).status, 403);
        assert.equal((await post("/api/auth/initiate", portal, portal === "admin" ? "admin" : "worker1")).status, 200);
      }
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
}

test("unknown deployment modes fail closed", () => {
  assert.throws(() => mountPortalApi(express(), "public-and-staff", {}), /APP_PORTAL/);
  assert.throws(() => mountPortalApi(express(), "staff", {}), /APP_PORTAL/);
});
