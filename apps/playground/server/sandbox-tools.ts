import { spawn } from "node:child_process";
import { lstat, mkdir, open, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Tool } from "@agentdock-ai/agentdock";
import type { JsonObject, JsonValue } from "@agentdock-ai/contracts";

const DEFAULT_SANDBOX = resolve(dirname(fileURLToPath(import.meta.url)), ".sandbox");
const MAX_FILE_BYTES = 256_000;
const MAX_COMMAND_OUTPUT = 32_000;
const COMMAND_TIMEOUT_MS = 10_000;

export function createSandboxTools(sandboxDirectory = DEFAULT_SANDBOX): Tool[] {
  const configuredSandboxRoot = resolve(sandboxDirectory);
  return [
    {
      name: "create_file",
      description: "Create a new text or code file inside the isolated .sandbox folder. Use a relative path. Existing files are never overwritten.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path inside .sandbox, for example notes/hello.md." },
          content: { type: "string", description: "Complete initial file content." },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
      execute: async ({ input, reportProgress }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, requireString(input, "path"), true);
        const content = requireString(input, "content", true);
        assertFileSize(content);
        reportProgress?.(`Creating ${relative(sandboxRoot, file)}`);
        const handle = await open(file, "wx", 0o600);
        try {
          await handle.writeFile(content, "utf8");
        } finally {
          await handle.close();
        }
        return { path: relative(sandboxRoot, file), bytes: Buffer.byteLength(content), created: true };
      },
    },
    {
      name: "update_file",
      description: "Replace the complete contents of an existing regular file inside .sandbox. Use a relative path; symlinks are rejected.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to an existing file inside .sandbox." },
          content: { type: "string", description: "The complete replacement file content." },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
      execute: async ({ input, reportProgress }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, requireString(input, "path"), false);
        const content = requireString(input, "content", true);
        assertFileSize(content);
        const stat = await lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Updates are limited to regular files in .sandbox.");
        reportProgress?.(`Updating ${relative(sandboxRoot, file)}`);
        await writeFile(file, content, { encoding: "utf8", flag: "w" });
        return { path: relative(sandboxRoot, file), bytes: Buffer.byteLength(content), updated: true };
      },
    },
    {
      name: "read_file",
      description: "Read a UTF-8 text file from inside .sandbox. Use a relative path.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
      execute: async ({ input }) => {
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const file = await safeTarget(sandboxRoot, requireString(input, "path"), false);
        const stat = await lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Reads are limited to regular files in .sandbox.");
        if (stat.size > MAX_FILE_BYTES) throw new Error(`File exceeds the ${MAX_FILE_BYTES}-byte read limit.`);
        return { path: relative(sandboxRoot, file), content: await readFile(file, "utf8") };
      },
    },
    {
      name: "run_command",
      description: "Run a JavaScript file with Node inside the restricted .sandbox. The only command is node; provide a relative script path and optional script arguments. Network and child-process access are disabled, filesystem access is confined to .sandbox, and execution has a 10 second timeout. Use checkOnly=true to syntax-check without running the script.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["node"], description: "Must be node." },
          script: { type: "string", description: "Relative .js, .mjs, or .cjs script path inside .sandbox." },
          args: { type: "array", items: { type: "string" }, description: "Optional script arguments." },
          checkOnly: { type: "boolean", description: "Only syntax-check the script; do not execute it." },
        },
        required: ["command", "script"],
        additionalProperties: false,
      },
      execute: async ({ input, signal, reportProgress }) => {
        if (input.command !== "node") throw new Error("Only the node command is allowed in .sandbox.");
        const sandboxRoot = await canonicalSandboxRoot(configuredSandboxRoot);
        const script = await safeTarget(sandboxRoot, requireString(input, "script"), false);
        if (!new Set([".js", ".mjs", ".cjs"]).has(script.slice(script.lastIndexOf(".")))) {
          throw new Error("run_command only accepts .js, .mjs, or .cjs files.");
        }
        const stat = await lstat(script);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("The script must be a regular file inside .sandbox.");
        const args = input.args === undefined ? [] : requireStringArray(input.args, "args");
        if (args.length > 32 || args.some((arg) => arg.length > 1_000)) throw new Error("Too many or oversized script arguments.");
        const checkOnly = input.checkOnly === true;
        reportProgress?.(`${checkOnly ? "Checking" : "Running"} node ${relative(sandboxRoot, script)}`);
        return runNodeSandboxed({ sandboxRoot, script, args, checkOnly, signal });
      },
    },
  ];
}

async function canonicalSandboxRoot(configuredRoot: string): Promise<string> {
  await mkdir(configuredRoot, { recursive: true });
  const stat = await lstat(configuredRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("The .sandbox root must be a regular directory.");
  return realpath(configuredRoot);
}

async function safeTarget(root: string, pathValue: string, createParents: boolean): Promise<string> {
  if (pathValue.length > 512 || pathValue.includes("\\") || pathValue.includes("\0") || isAbsolute(pathValue)) {
    throw new Error("Use a short relative path inside .sandbox.");
  }
  const parts = pathValue.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Path traversal and empty path segments are not allowed.");
  }
  const target = resolve(root, ...parts);
  if (!isInside(root, target) || target === root) throw new Error("Path must stay inside .sandbox.");
  await ensureSafeParents(root, dirname(target), createParents);
  const targetStat = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (targetStat?.isSymbolicLink()) throw new Error("Symlinks are not allowed in .sandbox tools.");
  return target;
}

async function ensureSafeParents(root: string, parent: string, create: boolean): Promise<void> {
  const relativeParent = relative(root, parent);
  let current = root;
  for (const segment of relativeParent ? relativeParent.split(sep) : []) {
    current = resolve(current, segment);
    if (create) await mkdir(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Directories inside .sandbox must be regular directories.");
    if (await realpath(current) !== current) throw new Error("Symlinks are not allowed in .sandbox paths.");
  }
}

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function requireString(input: JsonObject, key: string, allowEmpty = false): string {
  const value = input[key];
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) throw new Error(`${key} must be a non-empty string.`);
  return value;
}

function requireStringArray(value: JsonValue, key: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${key} must be an array of strings.`);
  }
  return value as string[];
}

function assertFileSize(content: string): void {
  if (Buffer.byteLength(content) > MAX_FILE_BYTES) throw new Error(`File content exceeds the ${MAX_FILE_BYTES}-byte limit.`);
}

interface SandboxedNodeOptions {
  sandboxRoot: string;
  script: string;
  args: string[];
  checkOnly: boolean;
  signal: AbortSignal;
}

async function runNodeSandboxed(options: SandboxedNodeOptions): Promise<JsonValue> {
  const { sandboxRoot, script, args, checkOnly, signal } = options;
  if (signal.aborted) throw signal.reason ?? new Error("Command cancelled.");
  const childArgs = [
    "--permission",
    `--allow-fs-read=${sandboxRoot}`,
    `--allow-fs-write=${sandboxRoot}`,
    ...(checkOnly ? ["--check", script] : [script, ...args]),
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
    const terminate = () => {
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
    child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
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
        command: `node ${relative(sandboxRoot, script)}${checkOnly ? " (syntax check)" : ""}`,
        exitCode: code ?? (timedOut || outputLimited || terminationSignal ? 1 : 0),
        stdout,
        stderr,
        timedOut,
        outputLimited,
        ...(signal.aborted ? { cancelled: true } : {}),
      });
    });
  });
}
