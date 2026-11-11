import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
  SITE_COOKIE,
  createSiteGate,
  createSiteRoutes,
  hasSiteAccess,
  keysEqual,
  parseCookies,
  siteToken,
} from "../src/middlewares/siteGate.middleware.js";

const SITE_KEY = "test-staff-site-key-with-enough-entropy-0123456789";

function makeApp({ portal, siteKey }) {
  const app = express();
  app.use(express.json());
  app.use("/api/site", createSiteRoutes({ siteKey, isProduction: false }));
  app.use(createSiteGate({ portal, siteKey }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/auth/login", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) => res.send("<html>staff</html>"));
  app.use((_req, res) => res.status(404).json({ error: "Not found." }));
  return app;
}

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

test("site key comparison is exact and length-safe", () => {
  assert.equal(keysEqual(SITE_KEY, SITE_KEY), true);
  assert.equal(keysEqual("wrong-key", SITE_KEY), false);
  assert.equal(keysEqual("", SITE_KEY), false);
  assert.equal(keysEqual(SITE_KEY, ""), false);
  assert.equal(keysEqual(undefined, SITE_KEY), false);
  assert.equal(siteToken(SITE_KEY) === SITE_KEY, false);
  assert.match(siteToken(SITE_KEY), /^[a-f0-9]{64}$/);
});

test("cookie parsing extracts the site token", () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies(""), {});
  assert.equal(parseCookies(`${SITE_COOKIE}=abc123; other=1`)[SITE_COOKIE], "abc123");
});

test("patient portal stays public without any key", async () => {
  const { server, base } = await listen(makeApp({ portal: "patient", siteKey: "" }));
  try {
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal(
      (await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status,
      200
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("staff portal without a key stays open in development", async () => {
  const { server, base } = await listen(makeApp({ portal: "admin", siteKey: "" }));
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.deepEqual(await (await fetch(`${base}/api/site/status`)).json(), { locked: false });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("staff portal with a key hides pages and APIs until unlocked", async () => {
  const { server, base } = await listen(makeApp({ portal: "admin", siteKey: SITE_KEY }));
  try {
    // Locked: pages and APIs answer 404, never the real content.
    assert.equal((await fetch(`${base}/`)).status, 404);
    assert.equal((await (await fetch(`${base}/`)).text()).includes("staff"), false);
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 404);
    assert.deepEqual(await health.json(), { error: "Not found." });
    assert.equal(
      (await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status,
      404
    );
    assert.deepEqual(await (await fetch(`${base}/api/site/status`)).json(), { locked: true });

    // Wrong key learns nothing.
    const wrong = await fetch(`${base}/api/site/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "wrong-key" }),
    });
    assert.equal(wrong.status, 404);
    assert.deepEqual(await (await fetch(`${base}/api/site/status`)).json(), { locked: true });

    // Correct key sets the HttpOnly unlock cookie.
    const unlocked = await fetch(`${base}/api/site/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: SITE_KEY }),
    });
    assert.equal(unlocked.status, 200);
    const setCookie = unlocked.headers.get("set-cookie") || "";
    assert.match(setCookie, new RegExp(`${SITE_COOKIE}=[a-f0-9]{64}`));
    assert.match(setCookie, /HttpOnly/);
    const cookie = setCookie.split(";")[0];

    // Cookie and header both grant access.
    assert.equal((await fetch(`${base}/api/health`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/api/health`, { headers: { "x-site-key": SITE_KEY } })).status, 200);
    assert.equal((await fetch(`${base}/api/health`, { headers: { "x-site-key": "wrong" } })).status, 404);
    assert.deepEqual(await (await fetch(`${base}/api/site/status`, { headers: { Cookie: cookie } })).json(), {
      locked: false,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("unlock cookie cannot be forged without the key", async () => {
  const { server, base } = await listen(makeApp({ portal: "health_worker", siteKey: SITE_KEY }));
  try {
    assert.equal(hasSiteAccess({ headers: { cookie: `${SITE_COOKIE}=forged` } }, SITE_KEY), false);
    assert.equal((await fetch(`${base}/api/health`, { headers: { Cookie: `${SITE_COOKIE}=forged` } })).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
