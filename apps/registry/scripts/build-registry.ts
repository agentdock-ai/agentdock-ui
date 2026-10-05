import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRegistry, registryRoot } from "./registry-source.ts";
export async function buildRegistry() {
  const output = resolve(registryRoot, "public/r");
  await mkdir(output, { recursive: true });
  const items = [];
  for (const flavor of ["radix", "base"] as const) {
    const item = await createRegistry(flavor);
    await writeFile(
      resolve(output, `chat-${flavor}.json`),
      JSON.stringify(item, null, 2) + "\n",
    );
    items.push({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
    });
  }
  await writeFile(
    resolve(registryRoot, "public/r/registry.json"),
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: "agentdock-ui",
        items,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Built chat registry: Radix and Base UI.");
}
await buildRegistry();
