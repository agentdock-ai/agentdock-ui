import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Tool } from "@agentdock-ai/agentdock";
import type { JsonObject } from "@agentdock-ai/contracts";
import { createSandboxTools } from "../playground/sandbox-tools.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function toolSet() {
  const root = await mkdtemp(join(tmpdir(), "agentdock-ui-sandbox-"));
  temporaryRoots.push(root);
  const tools = createSandboxTools(root);
  return {
    root,
    call: async (name: string, input: JsonObject) => {
      const tool = tools.find((item) => item.name === name) as Tool | undefined;
      if (!tool) throw new Error(`Missing test tool: ${name}`);
      return tool.execute({ input, ctx: {}, signal: new AbortController().signal, toolCallId: `test-${name}` });
    },
  };
}

describe(".sandbox tools", () => {
  it("creates, updates, and reads a file inside the sandbox", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", { path: "notes/readme.md", content: "first" });
    await sandbox.call("update_file", { path: "notes/readme.md", content: "updated" });
    const file = await sandbox.call("read_file", { path: "notes/readme.md" });

    expect(file).toEqual({ path: "notes/readme.md", content: "updated" });
  });

  it("rejects paths that try to leave the sandbox", async () => {
    const sandbox = await toolSet();
    await expect(sandbox.call("create_file", { path: "../outside.txt", content: "no" }))
      .rejects.toThrow("Path traversal");
  });

  it("runs Node scripts inside the filesystem-restricted sandbox", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", { path: "hello.mjs", content: "console.log('hello from sandbox')" });
    const result = await sandbox.call("run_command", { command: "node", script: "hello.mjs" }) as {
      exitCode: number; stdout: string;
    };
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello from sandbox");
  });

  it("blocks sandbox scripts from reading outside files", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", {
      path: "outside.mjs",
      content: "import { readFileSync } from 'node:fs'; readFileSync('/etc/hosts', 'utf8');",
    });
    const result = await sandbox.call("run_command", { command: "node", script: "outside.mjs" }) as {
      exitCode: number; stderr: string;
    };
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Access to this API has been restricted");
  });
});
