import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

for (const [entry, forbidden] of [
  ["App.jsx", /src\/users\/(admin|health_worker)\//],
  ["AdminApp.jsx", /src\/users\/(patient|health_worker)\//],
  ["HealthWorkerApp.jsx", /src\/users\/(patient|admin)\//],
]) {
  test(`${entry} bundles only its own portal's dashboards`, async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(`../src/utils/${entry}`, import.meta.url))],
      bundle: true, write: false, metafile: true, jsx: "automatic", platform: "browser", format: "esm",
      define: { "import.meta.env.VITE_API_BASE_URL": '"/api"' },
    });
    for (const input of Object.keys(result.metafile.inputs)) {
      assert.doesNotMatch(input.replaceAll("\\", "/"), forbidden);
    }
  });
}
