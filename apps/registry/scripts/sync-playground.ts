import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { createRegistry, registryRoot } from "./registry-source.ts";

// The playground exercises the same editable source shipped to consumer apps.
const registry = await createRegistry("radix");
const playground = resolve(registryRoot, "../playground");
const manifest = resolve(playground, ".agentdock-ui.json");
const previous = await readFile(manifest, "utf8").then(
  (text) => Object.keys((JSON.parse(text) as { files: object }).files),
  () => [],
);
const hashes: Record<string, string> = {};
for (const file of registry.files) {
  const target = resolve(registryRoot, "../playground/src", file.target);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.content);
  hashes[`src/${file.target}`] = createHash("sha256")
    .update(file.content)
    .digest("hex");
}
// Remove files an earlier sync wrote that the registry no longer ships.
for (const path of previous)
  if (!(path in hashes)) await rm(resolve(playground, path), { force: true });
await writeFile(
  manifest,
  JSON.stringify(
    {
      flavor: "radix",
      source: "agentdock-ui bundled registry",
      files: hashes,
    },
    null,
    2,
  ) + "\n",
);
console.log("Synced playground components from canonical registry source.");
