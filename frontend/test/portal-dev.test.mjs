import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

for (const [mode, ownEntry, otherEntry] of [
  ["development", "App.jsx", "AdminApp.jsx"],
  ["admin", "AdminApp.jsx", "HealthWorkerApp.jsx"],
  ["health-worker", "HealthWorkerApp.jsx", "AdminApp.jsx"],
]) {
  test(`${mode} dev server serves its JavaScript runtime while blocking other portals`, async () => {
    const server = await createServer({
      configFile: fileURLToPath(new URL("../vite.config.js", import.meta.url)),
      mode, logLevel: "silent", server: { port: 0, strictPort: false, open: false },
    });
    try {
      await server.listen();
      const base = `http://127.0.0.1:${server.httpServer.address().port}`;
      const client = await fetch(`${base}/@vite/client`);
      assert.equal(client.status, 200);
      assert.match(client.headers.get("content-type"), /javascript/);
      const clientSource = await client.text();
      assert.doesNotMatch(clientSource, /<!doctype html>/i);
      const runtimeImports = [...clientSource.matchAll(/^import\s*["']([^"']+)["']/gm)].map(match => match[1]);
      assert.ok(runtimeImports.some(path => path.includes("/vite/dist/client/env.mjs")));
      for (const path of runtimeImports) {
        const runtime = await fetch(new URL(path, base));
        assert.equal(runtime.status, 200, path);
        assert.match(runtime.headers.get("content-type"), /javascript/, path);
      }
      const main = await fetch(`${base}/src/main.jsx`);
      assert.match(main.headers.get("content-type"), /javascript/);
      assert.ok((await main.text()).includes(`/src/utils/${ownEntry}`));
      assert.equal((await fetch(`${base}/src/utils/${ownEntry}`)).status, 200);
      assert.equal((await fetch(`${base}/src/utils/${otherEntry}`)).status, 403);
      // Deny application builds without denying dependency folders named dist.
      if (mode !== "development") assert.equal((await fetch(`${base}/dist/index.html`)).status, 403);
    } finally {
      await server.close();
    }
  });
}
