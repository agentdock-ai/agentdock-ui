import { access, readFile, realpath } from "node:fs/promises";
import { resolve, relative, dirname, isAbsolute } from "node:path";
import { readJson } from "./json.js";
export type PrimitiveFlavor = "radix" | "base";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export interface Project {
  cwd: string;
  manager: PackageManager;
  flavor: PrimitiveFlavor;
  destination: string;
  config: Record<string, any>;
  needsConfig: boolean;
  package: Record<string, any>;
  workspaceRoot?: string;
}
async function findWorkspaceRoot(cwd: string): Promise<string | undefined> {
  let parent = dirname(cwd);
  while (parent !== dirname(parent)) {
    if (await exists(resolve(parent, "pnpm-workspace.yaml"))) return parent;
    const path = resolve(parent, "package.json");
    if (await exists(path)) {
      const pkg = await readJson(path);
      const patterns = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : pkg.workspaces?.packages;
      const location = relative(parent, cwd).replaceAll("\\", "/");
      if (
        Array.isArray(patterns) &&
        patterns.some((pattern: string) => {
          const expression = pattern
            .split("*")
            .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^/]+");
          return new RegExp(`^${expression}$`).test(location);
        })
      )
        return parent;
    }
    parent = dirname(parent);
  }
  return undefined;
}
export async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
export function inside(cwd: string, path: string) {
  const rel = relative(cwd, path);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith("../"))
    throw new Error(
      "Component destinations must be inside the consumer project.",
    );
  return path;
}
export async function safeDestination(cwd: string, path: string) {
  inside(cwd, path);
  let parent = path;
  while (!(await exists(parent))) parent = dirname(parent);
  inside(cwd, await realpath(parent));
  return path;
}
async function compilerPaths(
  cwd: string,
): Promise<{ alias: string; root: string }> {
  for (const file of ["tsconfig.json", "tsconfig.app.json", "jsconfig.json"]) {
    if (!(await exists(resolve(cwd, file)))) continue;
    const config = await readJson(resolve(cwd, file));
    const paths = config.compilerOptions?.paths ?? {};
    for (const [name, targets] of Object.entries(paths)) {
      if (
        !name.endsWith("/*") ||
        !Array.isArray(targets) ||
        typeof targets[0] !== "string" ||
        !targets[0].endsWith("/*")
      )
        continue;
      const root = inside(
        cwd,
        resolve(
          cwd,
          config.compilerOptions?.baseUrl ?? ".",
          targets[0].slice(0, -2),
        ),
      );
      return { alias: name.slice(0, -2), root };
    }
  }
  throw new Error(
    "Add a TypeScript path alias (for example @/* → ./src/*) before installing chat.",
  );
}
export async function detectProject(directory: string): Promise<Project> {
  const cwd = await realpath(resolve(directory));
  if (!(await exists(resolve(cwd, "package.json"))))
    throw new Error(
      "No package.json found. Use --cwd to select a React application.",
    );
  const pkg = await readJson(resolve(cwd, "package.json"));
  const workspaceRoot = await findWorkspaceRoot(cwd);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.react || !deps.tailwindcss)
    throw new Error(
      "Chat requires a React app with Tailwind configured. Install React and Tailwind first.",
    );
  const rootPackage =
    workspaceRoot && (await exists(resolve(workspaceRoot, "package.json")))
      ? await readJson(resolve(workspaceRoot, "package.json"))
      : undefined;
  const declaredManager = pkg.packageManager ?? rootPackage?.packageManager;
  let manager = (declaredManager?.split("@")[0] ?? "npm") as PackageManager;
  for (const [lock, value] of [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ] as const)
    if (
      !declaredManager &&
      (await exists(resolve(workspaceRoot ?? cwd, lock)))
    ) {
      manager = value;
      break;
    }
  if (!["npm", "pnpm", "yarn", "bun"].includes(manager))
    throw new Error("Unsupported package manager. Use npm, pnpm, yarn or bun.");
  const alias = await compilerPaths(cwd);
  const configPath = resolve(cwd, "components.json");
  const needsConfig = !(await exists(configPath));
  const cssCandidates = [
    "src/index.css",
    "src/style.css",
    "src/styles.css",
    "src/app/globals.css",
    "app/globals.css",
  ];
  let css: string | undefined;
  for (const path of cssCandidates)
    if (await exists(resolve(cwd, path))) {
      css = path;
      break;
    }
  const config = needsConfig
    ? {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: Boolean(deps.next),
        tsx: true,
        tailwind: { config: "", css, baseColor: "neutral", cssVariables: true },
        aliases: {
          components: `${alias.alias}/components`,
          ui: `${alias.alias}/components/ui`,
          utils: `${alias.alias}/lib/utils`,
        },
      }
    : await readJson(configPath);
  css = config.tailwind?.css;
  if (!css || !(await exists(inside(cwd, resolve(cwd, css)))))
    throw new Error(
      "Configure the host Tailwind CSS file in components.json (tailwind.css). No files were copied.",
    );
  const styles = await readFile(resolve(cwd, css), "utf8");
  if (
    !/(?:@import\s+["']tailwindcss["']|@tailwind\s+(?:base|utilities))/.test(
      styles,
    )
  )
    throw new Error(
      "The host CSS must import Tailwind before chat can be installed.",
    );
  if (
    ![
      "background",
      "foreground",
      "muted",
      "border",
      "primary",
      "ring",
      "destructive",
    ].every((token) => new RegExp(`--${token}\\s*:`).test(styles))
  )
    throw new Error(
      "Configure shadcn semantic theme tokens in your host CSS (background, foreground, muted, border, primary, ring, destructive). Chat inherits that theme.",
    );
  const componentsAlias = config.aliases?.components;
  if (
    typeof componentsAlias !== "string" ||
    !(
      componentsAlias === alias.alias ||
      componentsAlias.startsWith(`${alias.alias}/`)
    )
  )
    throw new Error(
      "The shadcn components alias must match a TypeScript path alias.",
    );
  const destination = await safeDestination(
    cwd,
    resolve(
      alias.root,
      componentsAlias.slice(alias.alias.length + 1),
      "agentdock-ui",
    ),
  );
  const flavor: PrimitiveFlavor = String(config.style).startsWith("base")
    ? "base"
    : "radix";
  return {
    cwd,
    manager,
    flavor,
    destination,
    config,
    needsConfig,
    package: pkg,
    workspaceRoot,
  };
}
