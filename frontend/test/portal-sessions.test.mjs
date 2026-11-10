import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

test("all three portal sessions coexist and signing out of one leaves the others signed in", async () => {
  // Deliberately share a storage object here: namespace isolation provides
  // protection in addition to the three independent browser origins.
  const values = new Map();
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    setItem: (key, value) => values.set(key, value),
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
  };
  try {
    const sessions = {};
    for (const portal of ["patient", "admin", "health_worker"]) {
      const result = await build({
        entryPoints: [fileURLToPath(new URL("../src/lib/auth.js", import.meta.url))],
        bundle: true, write: false, format: "esm",
        define: { "import.meta.env.VITE_PORTAL": JSON.stringify(portal) },
      });
      sessions[portal] = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
      sessions[portal].saveSession(`${portal}-token`, { user_id: portal, role: portal });
    }
    for (const [portal, session] of Object.entries(sessions)) {
      assert.equal(session.getSessionToken(), `${portal}-token`);
      assert.equal(session.getCurrentUser().role, portal);
    }
    sessions.admin.clearSession();
    assert.equal(sessions.admin.getCurrentUser(), null);
    assert.equal(sessions.admin.getSessionToken(), null);
    assert.equal(sessions.health_worker.getSessionToken(), "health_worker-token");
    assert.equal(sessions.patient.getSessionToken(), "patient-token");
    sessions.health_worker.clearSession();
    assert.equal(sessions.patient.getCurrentUser().role, "patient");
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
  }
});
