import { spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "langchain";
import { z } from "zod";
import type { JsonValue } from "@agentdock-ai/contracts";

const DEFAULT_SANDBOX = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".sandbox",
);
const MAX_FILE_BYTES = 256_000;
const MAX_COMMAND_OUTPUT = 32_000;
const COMMAND_TIMEOUT_MS = 10_000;

export function createSandboxTools(sandboxDirectory = DEFAULT_SANDBOX) {
  const configuredSandboxRoot = resolve(sandboxDirectory);
  return [
    tool(
      async ({ path, content }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, path, true);
        assertFileSize(content);
        const handle = await open(file, "wx", 0o600);
        try {
          await handle.writeFile(content, "utf8");
        } finally {
          await handle.close();
        }
        return {
          path: relative(sandboxRoot, file),
          bytes: Buffer.byteLength(content),
          created: true,
        };
      },
      {
        name: "create_file",
        description:
          "Create a new text or code file inside the isolated .sandbox folder. Use a relative path. Existing files are never overwritten.",
        schema: z.object({ path: z.string(), content: z.string() }),
      },
    ),
    tool(
      async ({ path, content }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, path, false);
        assertFileSize(content);
        const stat = await lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("Updates are limited to regular files in .sandbox.");
        await writeFile(file, content, { encoding: "utf8", flag: "w" });
        return {
          path: relative(sandboxRoot, file),
          bytes: Buffer.byteLength(content),
          updated: true,
        };
      },
      {
        name: "update_file",
        description:
          "Replace the complete contents of an existing regular file inside .sandbox. Use a relative path; symlinks are rejected.",
        schema: z.object({ path: z.string(), content: z.string() }),
      },
    ),
    tool(
      async ({ path }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, path, false);
        const stat = await lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("Reads are limited to regular files in .sandbox.");
        if (stat.size > MAX_FILE_BYTES)
          throw new Error(
            `File exceeds the ${MAX_FILE_BYTES}-byte read limit.`,
          );
        return {
          path: relative(sandboxRoot, file),
          content: await readFile(file, "utf8"),
        };
      },
      {
        name: "read_file",
        description:
          "Read a UTF-8 text file from inside .sandbox. Use a relative path.",
        schema: z.object({ path: z.string() }),
      },
    ),
    tool(
      async ({ command, script, checkOnly }, runtime) => {
        if (checkOnly !== true)
          throw new Error(
            "Code execution is unavailable. Use checkOnly=true to syntax-check a script.",
          );
        if (command !== "node")
          throw new Error("Only the node command is allowed in .sandbox.");
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const scriptPath = await safeTarget(sandboxRoot, script, false);
        if (
          !new Set([".js", ".mjs", ".cjs"]).has(
            scriptPath.slice(scriptPath.lastIndexOf(".")),
          )
        ) {
          throw new Error("run_command only accepts .js, .mjs, or .cjs files.");
        }
        const stat = await lstat(scriptPath);
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("The script must be a regular file inside .sandbox.");
        return runNodeSandboxed({
          sandboxRoot,
          script: scriptPath,
          signal: runtime.signal ?? new AbortController().signal,
        });
      },
      {
        name: "run_command",
        description:
          "Syntax-check a JavaScript file inside .sandbox using Node. Set command=node and checkOnly=true. Scripts are parsed without executing their code. Generated-code execution is unavailable in this playground.",
        schema: z.object({
          command: z.enum(["node"]),
          script: z.string(),
          checkOnly: z.boolean().optional(),
        }),
      },
    ),
  ];
}

async function canonicalSandboxRoot(configuredRoot: string): Promise<string> {
  await mkdir(configuredRoot, { recursive: true });
  const stat = await lstat(configuredRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("The .sandbox root must be a regular directory.");
  return realpath(configuredRoot);
}

async function safeTarget(
  root: string,
  pathValue: string,
  createParents: boolean,
): Promise<string> {
  if (
    pathValue.length > 512 ||
    pathValue.includes("\\") ||
    pathValue.includes("\0") ||
    isAbsolute(pathValue)
  ) {
    throw new Error("Use a short relative path inside .sandbox.");
  }
  const parts = pathValue.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Path traversal and empty path segments are not allowed.");
  }
  const target = resolve(root, ...parts);
  if (!isInside(root, target) || target === root)
    throw new Error("Path must stay inside .sandbox.");
  await ensureSafeParents(root, dirname(target), createParents);
  const targetStat = await lstat(target).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    },
  );
  if (targetStat?.isSymbolicLink())
    throw new Error("Symlinks are not allowed in .sandbox tools.");
  return target;
}

async function ensureSafeParents(
  root: string,
  parent: string,
  create: boolean,
): Promise<void> {
  const relativeParent = relative(root, parent);
  let current = root;
  for (const segment of relativeParent ? relativeParent.split(sep) : []) {
    current = resolve(current, segment);
    if (create)
      await mkdir(current).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST") throw error;
      });
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(
        "Directories inside .sandbox must be regular directories.",
      );
    if ((await realpath(current)) !== current)
      throw new Error("Symlinks are not allowed in .sandbox paths.");
  }
}

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}

function assertFileSize(content: string): void {
  if (Buffer.byteLength(content) > MAX_FILE_BYTES)
    throw new Error(`File content exceeds the ${MAX_FILE_BYTES}-byte limit.`);
}

interface SandboxedNodeOptions {
  sandboxRoot: string;
  script: string;
  signal: AbortSignal;
}

async function runNodeSandboxed(
  options: SandboxedNodeOptions,
): Promise<JsonValue> {
  const { sandboxRoot, script, signal } = options;
  if (signal.aborted) throw signal.reason ?? new Error("Command cancelled.");
  const childArgs = [
    "--permission",
    `--allow-fs-read=${sandboxRoot}`,
    "--check",
    script,
  ];
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: sandboxRoot,
      shell: false,
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputSize = 0;
    let timedOut = false;
    let outputLimited = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
    let terminating = false;
    const terminate = () => {
      if (terminating) return;
      terminating = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 250);
    };
    const append = (current: string, chunk: Buffer): string => {
      outputSize += chunk.byteLength;
      if (outputSize > MAX_COMMAND_OUTPUT) {
        outputLimited = true;
        terminate();
        return current;
      }
      return current + chunk.toString("utf8");
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, COMMAND_TIMEOUT_MS);
    const abort = () => terminate();
    signal.addEventListener("abort", abort, { once: true });
    child.once("error", (error) => {
      clearTimeout(timer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      signal.removeEventListener("abort", abort);
      rejectPromise(error);
    });
    child.once("close", (code, terminationSignal) => {
      clearTimeout(timer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      signal.removeEventListener("abort", abort);
      resolvePromise({
        command: `node ${relative(sandboxRoot, script)} (syntax check)`,
        exitCode:
          code ?? (timedOut || outputLimited || terminationSignal ? 1 : 0),
        stdout,
        stderr,
        timedOut,
        outputLimited,
        ...(signal.aborted ? { cancelled: true } : {}),
      });
    });
  });
}
