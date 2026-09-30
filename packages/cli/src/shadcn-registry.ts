import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { PrimitiveFlavor } from "./project-detection.js";
export interface RegistryFile {
  path: string;
  type: "registry:component";
  target: string;
  content: string;
}
export interface ChatRegistry {
  name: string;
  type: "registry:block";
  dependencies: string[];
  files: RegistryFile[];
  meta: { version: string; flavor: PrimitiveFlavor };
}
export async function loadRegistry(
  flavor: PrimitiveFlavor,
): Promise<ChatRegistry> {
  const directory = fileURLToPath(new URL("./registry/", import.meta.url));
  const item = JSON.parse(
    await readFile(resolve(directory, `chat-${flavor}.json`), "utf8"),
  ) as ChatRegistry;
  if (
    item.type !== "registry:block" ||
    !item.files.length ||
    item.meta.flavor !== flavor
  )
    throw new Error(
      "The bundled chat registry is invalid. Reinstall agentdock-ui.",
    );
  for (const file of item.files)
    if (
      !file.target.startsWith("components/agentdock-ui/") ||
      file.target.includes("..") ||
      !file.content ||
      file.content.includes("DESIGN REDESIGN REQUIRED")
    )
      throw new Error(
        "The bundled chat registry contains an invalid source file.",
      );
  return item;
}
