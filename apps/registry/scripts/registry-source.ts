import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
export const registryRoot = fileURLToPath(new URL("../", import.meta.url));
// Consumers bundle editable TypeScript; Next.js webpack requires extensionless source imports.
const sourceImports = (content: string) =>
  content.replace(/(["']\.{1,2}\/[^"']+)\.js(["'])/g, "$1$2");
export async function createRegistry(flavor: "radix" | "base") {
  const names = (await readdir(resolve(registryRoot, "registry/agentdock-ui")))
    .filter((name) => /\.tsx?$/.test(name))
    .sort();
  const files = [];
  for (const name of names) {
    const content = (
      await readFile(
        resolve(registryRoot, "registry/agentdock-ui", name),
        "utf8",
      )
    ).replaceAll('"../ui/', '"./ui/');
    if (content.includes("DESIGN REDESIGN REQUIRED"))
      throw new Error(`${name} has not passed visual review.`);
    files.push({
      path: `registry/agentdock-ui/${name}`,
      type: "registry:component",
      target: `components/agentdock-ui/${name}`,
      content: sourceImports(content),
    });
  }
  for (const name of [
    "button.tsx",
    "textarea.tsx",
    "collapsible.tsx",
    "dropdown-menu.tsx",
  ]) {
    const source =
      ["collapsible.tsx", "dropdown-menu.tsx"].includes(name) &&
      flavor === "base"
        ? name.replace(".tsx", ".base.tsx")
        : name;
    const content = (
      await readFile(resolve(registryRoot, "registry/ui", source), "utf8")
    ).replaceAll('"../agentdock-ui/utils.js"', '"../utils.js"');
    if (content.includes("DESIGN REDESIGN REQUIRED"))
      throw new Error(`${source} has not passed visual review.`);
    files.push({
      path: `registry/ui/${source}`,
      type: "registry:component",
      target: `components/agentdock-ui/ui/${name}`,
      content: sourceImports(content),
    });
  }
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `chat-${flavor}`,
    type: "registry:block",
    title: "Agentdock Chat",
    description: "A compact chat panel connected to an app-owned ChatAdapter.",
    dependencies: [
      "@agentdock-ai/react@^0.1.0",
      "@agentdock-ai/ui-core@^0.1.0",
      "react-markdown@^10.1.0",
      "remark-gfm@^4.0.1",
      "lucide-react@^1.46.0",
      flavor === "base" ? "@base-ui/react@^1.8.0" : "radix-ui@^1.6.7",
    ],
    registryDependencies: [],
    files,
    meta: { version: "1", flavor },
  };
}
