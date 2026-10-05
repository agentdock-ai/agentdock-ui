import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import * as core from "@agentdock-ai/ui-core";
import * as react from "@agentdock-ai/react";

const require = createRequire(import.meta.url);
test("packed runtime surface exposes one headless API without removed component paths", async () => {
  for (const runtime of [core, react]) {
    assert.equal(typeof runtime.selectRenderModel, "function");
    assert.equal(typeof runtime.decodeAgentEventStream, "function");
    assert.equal("selectRenderMessages" in runtime, false);
  }
  for (const path of [
    "components",
    "components/ui",
    "components/message",
    "components/chat",
    "styles.css",
  ]) {
    assert.throws(() => require.resolve(`@agentdock-ai/react/${path}`), {
      code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
    });
  }
  const manifest = JSON.parse(
    await readFile(
      new URL("../../react/package.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(manifest.exports), ["."]);
  const files = await readdir(new URL("../../react/dist/", import.meta.url));
  assert.equal(files.includes("components"), false);
  assert.equal(files.includes("styles.css"), false);
  const coreFiles = await readdir(
    new URL("../../ui-core/dist/", import.meta.url),
  );
  assert.equal(coreFiles.includes("select-render-messages.js"), false);
});
