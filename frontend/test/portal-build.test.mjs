import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

for (const [entry, forbidden] of [["App.jsx", /src\/users\/(admin|health_worker)\//], ["StaffApp.jsx", /src\/users\/patient\//]]) {
  test(`${entry} bundles only its own portal's dashboards`, async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(`../src/utils/${entry}`, import.meta.url))],
      bundle: true, write: false, metafile: true, jsx: "automatic", platform: "browser",
      define: { "import.meta.env.VITE_API_BASE_URL": '"/api"' },
    });
    for (const input of Object.keys(result.metafile.inputs)) {
      assert.doesNotMatch(input.replaceAll("\\", "/"), forbidden);
    }
  });
}
