import { readFile, readdir } from "node:fs/promises";
import { dirname, posix, resolve } from "node:path";
import assert from "node:assert/strict";
import { createRegistry, registryRoot } from "./registry-source.ts";
for (const flavor of ["radix", "base"] as const) {
  const expected = await createRegistry(flavor);
  const actual = JSON.parse(
    await readFile(
      resolve(registryRoot, `public/r/chat-${flavor}.json`),
      "utf8",
    ),
  );
  assert.deepEqual(
    actual,
    expected,
    "Registry is stale. Rebuild from canonical source.",
  );
  const paths = new Set<string>(
    actual.files.map((file: { target: string }) => file.target),
  );
  assert.equal(paths.size, actual.files.length);
  const imports = new Set<string>();
  for (const file of actual.files) {
    assert.ok(!file.target.includes(".."));
    assert.ok(
      !/DESIGN REDESIGN REQUIRED|@langchain|@assistant-ui|fetch\(/.test(
        file.content,
      ),
    );
    for (const match of file.content.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1];
      if (spec.startsWith(".")) {
        const target = posix
          .normalize(posix.join(dirname(file.target), spec))
          .replace(/\.js$/, "");
        assert.ok(
          paths.has(`${target}.ts`) || paths.has(`${target}.tsx`),
          `Unresolved import: ${file.target} → ${spec}`,
        );
      } else
        imports.add(
          spec.startsWith("@")
            ? spec.split("/").slice(0, 2).join("/")
            : spec.split("/")[0],
        );
    }
  }
  for (const dep of imports)
    if (dep !== "react")
      assert.ok(
        actual.dependencies.some((entry: string) =>
          entry.startsWith(`${dep}@`),
        ),
        `Undeclared dependency ${dep}`,
      );
  assert.ok(
    actual.files.find((file: { target: string }) =>
      file.target.endsWith("/chat.tsx"),
    ),
  );
}
console.log(
  "Registry paths, dependency closure, source freshness and protocol boundary verified.",
);

const playground = resolve(registryRoot, "../playground/src");
const radix = await createRegistry("radix");
for (const file of radix.files) {
  assert.equal(
    await readFile(resolve(playground, file.target), "utf8"),
    file.content,
    `Playground source is stale: ${file.target}. Run yarn registry:sync.`,
  );
}
const manifests = await readdir(resolve(registryRoot, "public/r"));
assert.deepEqual(manifests.sort(), [
  "chat-base.json",
  "chat-radix.json",
  "registry.json",
]);
