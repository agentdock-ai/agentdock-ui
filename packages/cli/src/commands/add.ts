import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  detectProject,
  exists,
  safeDestination,
  type Project,
} from "../project-detection.js";
import { readJson } from "../json.js";
import { stringMap } from "../project-config.js";
import { loadRegistry } from "../shadcn-registry.js";
import { missingDependencies, packageName } from "../dependencies.js";
export interface AddOptions {
  cwd: string;
  dryRun?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  confirm?: (message: string) => Promise<boolean>;
}
const hash = (content: string) =>
  createHash("sha256").update(content).digest("hex");
async function install(project: Project, dependencies: string[]) {
  if (!dependencies.length) return;
  const command = project.manager === "npm" ? "install" : "add";
  const inYarnWorkspace = project.manager === "yarn" && project.workspaceRoot;
  const packagePath = resolve(project.cwd, "package.json");
  const original = inYarnWorkspace
    ? await readFile(packagePath, "utf8")
    : undefined;
  // Run Yarn Classic from the workspace root so root resolutions (including local links) apply.
  if (inYarnWorkspace) {
    const pkg = {
      ...project.package,
      dependencies: { ...project.package.dependencies },
    };
    for (const dependency of dependencies) {
      const name = packageName(dependency);
      pkg.dependencies[name] = dependency.slice(name.length + 1);
    }
    await writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  }
  try {
    await new Promise<void>((resolvePromise, reject) => {
      const args = inYarnWorkspace
        ? ["install", "--non-interactive"]
        : [command, ...dependencies];
      const child = spawn(project.manager, args, {
        cwd: inYarnWorkspace ? project.workspaceRoot : project.cwd,
        stdio: "inherit",
        shell: false,
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolvePromise()
          : reject(
              new Error(
                "Dependency installation failed. No chat source was copied.",
              ),
            ),
      );
    });
  } catch (error) {
    if (original !== undefined) await writeFile(packagePath, original);
    throw error;
  }
}

/** Preflight the entire operation, preserve consumer edits, then copy the bundled registry. */
export async function addChat(options: AddOptions) {
  const project = await detectProject(options.cwd);
  const registry = await loadRegistry(project.flavor);
  const receiptPath = await safeDestination(
    project.cwd,
    resolve(project.cwd, ".agentdock-ui.json"),
  );
  let receipt: { files?: Record<string, string> } = {};
  if (await exists(receiptPath))
    receipt = {
      files: stringMap(
        (await readJson(receiptPath)).files,
        "Installation receipt files",
      ),
    };
  const files = await Promise.all(
    registry.files.map(async (file) => {
      const path = await safeDestination(
        project.cwd,
        resolve(
          project.destination,
          file.target.slice("components/agentdock-ui/".length),
        ),
      );
      const content = file.content;
      const before = (await exists(path)) ? await readFile(path, "utf8") : null;
      const key = relative(project.cwd, path).replaceAll("\\", "/");
      const edited =
        before !== null &&
        before !== content &&
        receipt.files?.[key] !== hash(before);
      return { path, key, content, before, edited };
    }),
  );
  const declared = {
    ...project.package.devDependencies,
    ...project.package.dependencies,
  };
  const missing = await missingDependencies(
    project.cwd,
    registry.dependencies,
    declared,
  );
  const conflicts = files.filter((file) => file.edited);
  let overwrite = Boolean(options.overwrite);
  if (
    conflicts.length &&
    !overwrite &&
    !options.yes &&
    !options.dryRun &&
    options.confirm
  )
    overwrite = await options.confirm(
      `Overwrite ${conflicts.length} edited/existing chat file(s)?\n${conflicts.map((file) => `  ${file.key}`).join("\n")}`,
    );
  const writes = files.filter(
    (file) => file.before !== file.content && (!file.edited || overwrite),
  );
  const preserved = files.filter((file) => file.edited && !overwrite);
  const summary = {
    flavor: project.flavor,
    manager: project.manager,
    destination: project.destination,
    dependencies: missing,
    copied: writes.map((f) => f.key),
    preserved: preserved.map((f) => f.key),
    config: project.needsConfig,
  };
  if (options.dryRun) return summary;
  if (project.needsConfig && !options.yes && !options.confirm)
    throw new Error(
      "Use --yes to create components.json in a non-interactive install, or run from a terminal.",
    );
  if (
    project.needsConfig &&
    !options.yes &&
    options.confirm &&
    !(await options.confirm(
      "Create components.json using the app's existing alias and theme?",
    ))
  )
    throw new Error("Installation cancelled before copying source.");
  if (
    preserved.length &&
    !(await exists(resolve(project.destination, "chat.tsx")))
  )
    throw new Error(
      "Existing files conflict with the chat block. Use --overwrite to install a consistent source set.",
    );
  await install(project, missing);
  const originals = new Map<string, string | null>(
    writes.map((file) => [file.path, file.before]),
  );
  if (project.needsConfig)
    originals.set(resolve(project.cwd, "components.json"), null);
  originals.set(
    receiptPath,
    (await exists(receiptPath)) ? await readFile(receiptPath, "utf8") : null,
  );
  try {
    for (const file of writes) {
      await mkdir(dirname(file.path), { recursive: true });
      await atomicWrite(file.path, file.content);
    }
    if (project.needsConfig)
      await atomicWrite(
        resolve(project.cwd, "components.json"),
        JSON.stringify(project.config, null, 2) + "\n",
      );
    const hashes = { ...receipt.files };
    for (const file of files)
      if (!file.edited || overwrite) hashes[file.key] = hash(file.content);
    await atomicWrite(
      receiptPath,
      JSON.stringify(
        {
          flavor: project.flavor,
          source: "agentdock-ui bundled registry",
          files: hashes,
        },
        null,
        2,
      ) + "\n",
    );
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    for (const [path, original] of originals) {
      if (original === null) await unlink(path).catch(() => {});
      else await writeFile(path, original);
    }
    throw error;
  }
  return summary;
}
async function atomicWrite(path: string, content: string) {
  const temp = `${path}.agentdock-${process.pid}.tmp`;
  await writeFile(temp, content, { flag: "wx" });
  try {
    await rename(temp, path);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(temp).catch(() => {});
    throw error;
  }
}
