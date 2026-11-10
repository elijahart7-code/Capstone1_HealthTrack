import test from "node:test";
import assert from "node:assert/strict";

import { withTimeout } from "../src/config/db.js";

test("withTimeout rejects with a clear timeout message when a DB call hangs", async () => {
  const started = Date.now();
  await assert.rejects(
    withTimeout(new Promise(() => {}), 25, "Database connection"),
    /Database connection timed out after 25ms/,
  );
  assert.ok(Date.now() - started >= 25);
});
