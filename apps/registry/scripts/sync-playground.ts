import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { createRegistry, registryRoot } from "./registry-source.ts";

// The playground exercises the same editable source shipped to consumer apps.
const registry = await createRegistry("radix");
const hashes: Record<string, string> = {};
for (const file of registry.files) {
  const target = resolve(registryRoot, "../playground/src", file.target);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.content);
  hashes[`src/${file.target}`] = createHash("sha256")
    .update(file.content)
    .digest("hex");
}
await writeFile(
  resolve(registryRoot, "../playground/.agentdock-ui.json"),
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
