import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, posix } from "node:path";
import type { PrimitiveFlavor } from "./project-detection.js";
import { object } from "./project-config.js";
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
  meta: { flavor: PrimitiveFlavor };
}

export function parseRegistry(
  value: unknown,
  flavor: PrimitiveFlavor,
): ChatRegistry {
  const item = object(value, "Bundled chat registry");
  const meta = object(item.meta, "Registry metadata");
  if (
    item.name !== `chat-${flavor}` ||
    item.type !== "registry:block" ||
    meta.flavor !== flavor ||
    !Array.isArray(item.files) ||
    !item.files.length ||
    !Array.isArray(item.dependencies) ||
    !item.dependencies.every(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    )
  )
    throw new Error(
      "The bundled chat registry is invalid. Reinstall agentdock-ui.",
    );
  const targets = new Set<string>();
  const files: RegistryFile[] = item.files.map((value: unknown) => {
    const file = object(value, "Registry file");
    if (
      file.type !== "registry:component" ||
      typeof file.path !== "string" ||
      typeof file.target !== "string" ||
      !file.target.startsWith("components/agentdock-ui/") ||
      file.target.includes("\\") ||
      posix.normalize(file.target) !== file.target ||
      !/\.tsx?$/.test(file.target) ||
      targets.has(file.target) ||
      typeof file.content !== "string" ||
      !file.content ||
      file.content.includes("DESIGN REDESIGN REQUIRED")
    )
      throw new Error(
        "The bundled chat registry contains an invalid source file.",
      );
    targets.add(file.target);
    return {
      path: file.path,
      type: "registry:component",
      target: file.target,
      content: file.content,
    };
  });
  return {
    name: `chat-${flavor}`,
    type: "registry:block",
    meta: { flavor },
    files,
    dependencies: item.dependencies,
  };
}
export async function loadRegistry(
  flavor: PrimitiveFlavor,
): Promise<ChatRegistry> {
  const directory = fileURLToPath(new URL("./registry/", import.meta.url));
  const value: unknown = JSON.parse(
    await readFile(resolve(directory, `chat-${flavor}.json`), "utf8"),
  );
  return parseRegistry(value, flavor);
}
