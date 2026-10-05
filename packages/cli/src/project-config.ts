import { readJson } from "./json.js";

export type JsonRecord = Record<string, unknown>;
export interface ProjectPackage extends JsonRecord {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}
export interface ComponentsConfig extends JsonRecord {
  style?: string;
  tailwind?: JsonRecord & { css?: string };
  aliases?: Record<string, string>;
}

export function object(value: unknown, name: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name} must be an object.`);
  return value as JsonRecord;
}
export function string(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${name} must be a string.`);
  return value;
}
function strings(value: unknown, name: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry): entry is string => typeof entry === "string")
  )
    throw new Error(`${name} must be an array of strings.`);
  return value;
}
export function stringMap(
  value: unknown,
  name: string,
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(object(value, name))) {
    if (typeof entry !== "string")
      throw new Error(`${name}.${key} must be a string.`);
    Object.defineProperty(result, key, {
      value: entry,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}
export async function readProjectPackage(
  path: string,
): Promise<ProjectPackage> {
  const value = await readJson(path);
  let workspaces: ProjectPackage["workspaces"];
  if (value.workspaces !== undefined) {
    workspaces = Array.isArray(value.workspaces)
      ? strings(value.workspaces, "workspaces")
      : {
          packages: strings(
            object(value.workspaces, "workspaces").packages,
            "workspaces.packages",
          ),
        };
  }
  return {
    ...value,
    packageManager: string(value.packageManager, "packageManager"),
    dependencies: stringMap(value.dependencies, "dependencies"),
    devDependencies: stringMap(value.devDependencies, "devDependencies"),
    workspaces,
  };
}
export async function readComponentsConfig(
  path: string,
): Promise<ComponentsConfig> {
  const value = await readJson(path);
  const tailwind =
    value.tailwind === undefined
      ? undefined
      : object(value.tailwind, "tailwind");
  return {
    ...value,
    style: string(value.style, "style"),
    tailwind: tailwind && {
      ...tailwind,
      css: string(tailwind.css, "tailwind.css"),
    },
    aliases: stringMap(value.aliases, "aliases"),
  };
}
