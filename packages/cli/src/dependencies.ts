import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { satisfies, subset, validRange } from "semver";

export function packageName(spec: string): string {
  const separator = spec.indexOf("@", spec.startsWith("@") ? 1 : 0);
  return separator === -1 ? spec : spec.slice(0, separator);
}

async function installedVersion(
  cwd: string,
  name: string,
): Promise<string | undefined> {
  let directory = cwd;
  while (true) {
    try {
      const pkg = JSON.parse(
        await readFile(
          resolve(directory, "node_modules", name, "package.json"),
          "utf8",
        ),
      );
      if (typeof pkg.version === "string") return pkg.version;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** Preflight compatibility without silently upgrading dependencies owned by the host app. */
export async function missingDependencies(
  cwd: string,
  required: readonly string[],
  declared: Record<string, string>,
): Promise<string[]> {
  const missing: string[] = [];
  for (const spec of required) {
    const name = packageName(spec);
    const range = spec.slice(name.length + 1);
    const declaration = declared[name];
    if (!declaration) {
      missing.push(spec);
      continue;
    }
    const installed = await installedVersion(cwd, name);
    const declaredRange = validRange(declaration);
    if (
      (declaredRange && !subset(declaredRange, range)) ||
      (installed && !satisfies(installed, range)) ||
      (!declaredRange && !installed)
    ) {
      throw new Error(
        `${name} is incompatible or cannot be verified (${declaration}${installed ? `; installed ${installed}` : ""}). Chat requires ${range}. Update/install this dependency before adding chat. No files were copied.`,
      );
    }
  }
  return missing;
}
