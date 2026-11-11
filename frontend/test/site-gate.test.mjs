import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("staff apps render behind the site key gate", async () => {
  const gate = await read("src/auth/SiteKeyGate.jsx");
  assert.match(gate, /\/api\/site\/status/);
  assert.match(gate, /\/api\/site\/unlock/);
  assert.match(gate, /Restricted area/);
  assert.doesNotMatch(gate, /type="file"/);

  for (const app of ["src/utils/AdminApp.jsx", "src/utils/HealthWorkerApp.jsx"]) {
    const source = await read(app);
    assert.match(source, /SiteKeyGate/, `${app} must wrap its routes in the gate`);
  }
});

test("patient app stays public without the site key gate", async () => {
  const source = await read("src/utils/App.jsx");
  assert.doesNotMatch(source, /SiteKeyGate/);
});

test("API client carries the unlock cookie on split deployments", async () => {
  const source = await read("src/lib/axios.js");
  assert.match(source, /withCredentials:\s*true/);
});
