import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readJson } from "../dist/json.js";
import {
  readProjectPackage,
  readComponentsConfig,
} from "../dist/project-config.js";
import { loadRegistry, parseRegistry } from "../dist/shadcn-registry.js";

async function file(t, content) {
  const root = await mkdtemp(join(tmpdir(), "agentdock-json-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "config.json");
  await writeFile(path, content);
  return path;
}
test("JSONC preserves comment markers in strings and handles trailing commas", async (t) => {
  const path = await file(
    t,
    '{/*comment*/"url":"https://example.test/a//b", "quote":"\\\"/*literal*/", //comment\n"list":["item",],}',
  );
  assert.deepEqual(await readJson(path), {
    url: "https://example.test/a//b",
    quote: '\"/*literal*/',
    list: ["item"],
  });
});
for (const content of [
  "null",
  "[]",
  '"text"',
  '{"value":1} /*',
  '{"value":1/*x*/2}',
]) {
  test(`JSONC rejects invalid object: ${content}`, async (t) => {
    await assert.rejects(readJson(await file(t, content)));
  });
}
for (const [key, value] of [
  ["dependencies", { react: 42 }],
  ["workspaces", [false]],
  ["packageManager", 1],
]) {
  test(`package metadata rejects invalid ${key}`, async (t) => {
    await assert.rejects(
      readProjectPackage(await file(t, JSON.stringify({ [key]: value }))),
      /must be/,
    );
  });
}
for (const value of [
  { aliases: { components: false } },
  { tailwind: { css: 42 } },
  { style: { name: "base" } },
]) {
  test(`component config validates ${JSON.stringify(value)}`, async (t) => {
    await assert.rejects(
      readComponentsConfig(await file(t, JSON.stringify(value))),
      /must be/,
    );
  });
}
test("both bundled primitive choices share the current unversioned registry contract", async () => {
  for (const flavor of ["radix", "base"]) {
    const registry = await loadRegistry(flavor);
    assert.deepEqual(registry.meta, { flavor });
    assert.ok(registry.files.some((file) => file.target.endsWith("/chat.tsx")));
  }
});
test("registry validation rejects corruption, duplicate destinations and path traversal", async () => {
  const valid = await loadRegistry("radix");
  for (const patch of [
    { meta: null },
    { files: [] },
    { dependencies: [false] },
    { files: [null] },
    { files: [valid.files[0], valid.files[0]] },
    ...[
      "components/agentdock-ui/../escape.tsx",
      "components/agentdock-ui/\\escape.tsx",
      "other/file.tsx",
    ].map((target) => ({ files: [{ ...valid.files[0], target }] })),
  ]) {
    assert.throws(() => parseRegistry({ ...valid, ...patch }, "radix"));
  }
});
