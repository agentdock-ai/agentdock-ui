import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolInterface } from "@langchain/core/tools";
import type { JsonObject } from "@agentdock-ai/contracts";
import { createSandboxTools } from "../server/sandbox-tools.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function toolSet() {
  const root = await mkdtemp(join(tmpdir(), "agentdock-ui-sandbox-"));
  temporaryRoots.push(root);
  const tools = createSandboxTools(root);
  return {
    root,
    call: async (name: string, input: JsonObject) => {
      const selected = tools.find((item) => item.name === name) as
        ToolInterface | undefined;
      if (!selected) throw new Error(`Missing test tool: ${name}`);
      return selected.invoke(input);
    },
  };
}

describe(".sandbox tools", () => {
  it.each([undefined, false])(
    "rejects execution even for valid scripts (checkOnly=%s)",
    async (checkOnly) => {
      const sandbox = await toolSet();
      await sandbox.call("create_file", {
        path: "unsafe.mjs",
        content: "throw new Error('must not execute')",
      });
      await expect(
        sandbox.call("run_command", {
          command: "node",
          script: "unsafe.mjs",
          ...(checkOnly === undefined ? {} : { checkOnly }),
        }),
      ).rejects.toThrow("Code execution is unavailable");
    },
  );
  it("does not execute SQLite, network, filesystem or subprocess code during syntax checks", async () => {
    const sandbox = await toolSet();
    const outsideRoot = await mkdtemp(join(tmpdir(), "agentdock-ui-outside-"));
    temporaryRoots.push(outsideRoot);
    const outside = join(outsideRoot, "marker.txt");
    await writeFile(outside, "marker");
    await sandbox.call("create_file", {
      path: "unsafe.mjs",
      content: `import { DatabaseSync } from 'node:sqlite'; import { writeFileSync } from 'node:fs'; import { execSync } from 'node:child_process'; writeFileSync(${JSON.stringify(outside)}, 'changed'); new DatabaseSync(${JSON.stringify(outside + ".sqlite")}); fetch('https://example.invalid'); execSync('false');`,
    });
    const result = (await sandbox.call("run_command", {
      command: "node",
      script: "unsafe.mjs",
      checkOnly: true,
    })) as { exitCode: number; stdout: string };
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(await readFile(outside, "utf8")).toBe("marker");
    await expect(readFile(outside + ".sqlite")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("reports invalid syntax and rejects linked script paths", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", {
      path: "invalid.mjs",
      content: "const = ;",
    });
    const result = (await sandbox.call("run_command", {
      command: "node",
      script: "invalid.mjs",
      checkOnly: true,
    })) as { exitCode: number };
    expect(result.exitCode).not.toBe(0);
    await symlink(
      join(sandbox.root, "invalid.mjs"),
      join(sandbox.root, "linked.mjs"),
    );
    await expect(
      sandbox.call("run_command", {
        command: "node",
        script: "linked.mjs",
        checkOnly: true,
      }),
    ).rejects.toThrow("Symlinks");
  });
  it("creates, updates, and reads a file inside the sandbox", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", {
      path: "notes/readme.md",
      content: "first",
    });
    await sandbox.call("update_file", {
      path: "notes/readme.md",
      content: "updated",
    });
    const file = await sandbox.call("read_file", { path: "notes/readme.md" });

    expect(file).toEqual({ path: "notes/readme.md", content: "updated" });
  });

  it("rejects paths that try to leave the sandbox", async () => {
    const sandbox = await toolSet();
    await expect(
      sandbox.call("create_file", { path: "../outside.txt", content: "no" }),
    ).rejects.toThrow("Path traversal");
  });

  it("syntax-checks Node scripts without executing them", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", {
      path: "hello.mjs",
      content: "console.log('hello from sandbox')",
    });
    const result = (await sandbox.call("run_command", {
      command: "node",
      script: "hello.mjs",
      checkOnly: true,
    })) as {
      exitCode: number;
      stdout: string;
    };
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("blocks sandbox scripts from reading outside files", async () => {
    const sandbox = await toolSet();
    await sandbox.call("create_file", {
      path: "outside.mjs",
      content:
        "import { readFileSync } from 'node:fs'; readFileSync('/etc/hosts', 'utf8');",
    });
    await expect(
      sandbox.call("run_command", {
        command: "node",
        script: "outside.mjs",
        checkOnly: false,
      }),
    ).rejects.toThrow("Code execution is unavailable");
  });
});
