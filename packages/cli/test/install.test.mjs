import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addChat } from "../dist/commands/add.js";
const dependencies = {
  react: "^19.0.0",
  tailwindcss: "^4.0.0",
  "@agentdock-ai/react": "^0.1.0",
  "@agentdock-ai/ui-core": "^0.1.0",
  "@agentdock-ai/contracts": "^0.2.0",
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "lucide-react": "^1.46.0",
  "radix-ui": "^1.6.7",
  "@base-ui/react": "^1.8.0",
};
async function fixture(t, style) {
  const cwd = await mkdtemp(join(tmpdir(), "agentdock-cli-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await mkdir(join(cwd, "src"));
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ private: true, dependencies }),
  );
  await writeFile(
    join(cwd, "tsconfig.json"),
    '// host configuration\n{"compilerOptions":{"paths":{"@/*":["./src/*"],},},}',
  );
  await writeFile(
    join(cwd, "src/index.css"),
    '@import "tailwindcss"; :root {' +
      [
        "background",
        "foreground",
        "muted",
        "border",
        "primary",
        "ring",
        "destructive",
      ]
        .map((name) => `--${name}: white;`)
        .join("") +
      "}",
  );
  if (style)
    await writeFile(
      join(cwd, "components.json"),
      JSON.stringify({
        style,
        tailwind: { css: "src/index.css" },
        aliases: { components: "@/components" },
      }),
    );
  return cwd;
}
test("dry run is read-only; first install creates setup; repeat preserves consumer edits", async (t) => {
  const cwd = await fixture(t);
  const before = await readdir(cwd);
  const dry = await addChat({ cwd, dryRun: true, yes: true });
  assert.equal(dry.flavor, "radix");
  assert.deepEqual(await readdir(cwd), before);
  assert.ok(dry.copied.length >= 20);
  const first = await addChat({ cwd, yes: true });
  assert.equal(first.copied.length, dry.copied.length);
  const path = join(cwd, "src/components/agentdock-ui/chat.tsx");
  const canonical = await readFile(path, "utf8");
  await writeFile(path, canonical + "\n// consumer edit\n");
  const second = await addChat({ cwd, yes: true });
  assert.equal(second.copied.length, 0);
  assert.deepEqual(second.preserved, ["src/components/agentdock-ui/chat.tsx"]);
  assert.ok((await readFile(path, "utf8")).includes("consumer edit"));
  await addChat({ cwd, yes: true, overwrite: true });
  assert.equal(await readFile(path, "utf8"), canonical);
});
test("Base UI style selects only the Base disclosure and keeps host configuration", async (t) => {
  const cwd = await fixture(t, "base-nova");
  const before = await readFile(join(cwd, "components.json"), "utf8");
  const result = await addChat({ cwd, yes: true });
  assert.equal(result.flavor, "base");
  assert.equal(await readFile(join(cwd, "components.json"), "utf8"), before);
  assert.ok(
    (
      await readFile(
        join(cwd, "src/components/agentdock-ui/ui/collapsible.tsx"),
        "utf8",
      )
    ).includes("@base-ui/react/collapsible"),
  );
});
test("missing prerequisites and external destinations fail before writing", async (t) => {
  const cwd = await fixture(t, "new-york");
  await writeFile(join(cwd, "src/index.css"), '@import "tailwindcss";');
  await assert.rejects(addChat({ cwd, yes: true }), /semantic theme tokens/);
  assert.ok(!(await readdir(cwd)).includes(".agentdock-ui.json"));
});
test("an existing consumer file requires an explicit overwrite decision", async (t) => {
  const cwd = await fixture(t, "new-york");
  await mkdir(join(cwd, "src/components/agentdock-ui"), { recursive: true });
  await writeFile(
    join(cwd, "src/components/agentdock-ui/chat.tsx"),
    "// owned by consumer\n",
  );
  let asked = false;
  const result = await addChat({
    cwd,
    confirm: async (message) => {
      asked = message.includes("chat.tsx");
      return false;
    },
  });
  assert.equal(asked, true);
  assert.equal(result.preserved.length, 1);
  assert.equal(
    await readFile(join(cwd, "src/components/agentdock-ui/chat.tsx"), "utf8"),
    "// owned by consumer\n",
  );
});
test("symlink destinations cannot copy source outside the app", async (t) => {
  const cwd = await fixture(t, "new-york");
  const outside = await mkdtemp(join(tmpdir(), "agentdock-external-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(cwd, "src/components"));
  await assert.rejects(addChat({ cwd, yes: true }), /inside the consumer/);
  assert.deepEqual(await readdir(outside), []);
});
test("incompatible declared dependencies fail before any files or package changes", async (t) => {
  for (const version of ["^8.0.0", "^9.0.0", "10.0.0", "*", ">=8"]) {
    const cwd = await fixture(t);
    const path = join(cwd, "package.json");
    const pkg = {
      private: true,
      dependencies: { ...dependencies, "react-markdown": version },
    };
    const original = JSON.stringify(pkg);
    await writeFile(path, original);
    const before = await readdir(cwd);
    await assert.rejects(
      addChat({ cwd, yes: true }),
      /react-markdown.*requires \^10\.1\.0/,
    );
    assert.deepEqual(await readdir(cwd), before);
    assert.equal(await readFile(path, "utf8"), original);
  }
});
test("compatible versions and verified local dependencies are preserved", async (t) => {
  const cwd = await fixture(t);
  const pkg = {
    private: true,
    dependencies: {
      ...dependencies,
      "react-markdown": "10.1.1",
      "@agentdock-ai/react": "workspace:*",
    },
  };
  await writeFile(join(cwd, "package.json"), JSON.stringify(pkg));
  await mkdir(join(cwd, "node_modules/@agentdock-ai/react"), {
    recursive: true,
  });
  await writeFile(
    join(cwd, "node_modules/@agentdock-ai/react/package.json"),
    JSON.stringify({ name: "@agentdock-ai/react", version: "0.1.0" }),
  );
  assert.deepEqual(
    (await addChat({ cwd, yes: true, dryRun: true })).dependencies,
    [],
  );
});
test("rejects incompatible installed versions and unverifiable local dependencies", async (t) => {
  const cwd = await fixture(t);
  await mkdir(join(cwd, "node_modules/react-markdown"), { recursive: true });
  await writeFile(
    join(cwd, "node_modules/react-markdown/package.json"),
    JSON.stringify({ version: "8.0.7" }),
  );
  await assert.rejects(addChat({ cwd, dryRun: true }), /installed 8\.0\.7/);
  await rm(join(cwd, "node_modules"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({
      dependencies: { ...dependencies, "react-markdown": "file:../markdown" },
    }),
  );
  await assert.rejects(addChat({ cwd, dryRun: true }), /cannot be verified/);
});
test("detects pnpm workspaces and inherits root package-manager metadata", async (t) => {
  for (const withLock of [false, true]) {
    const root = await mkdtemp(join(tmpdir(), "agentdock-pnpm-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const cwd = join(root, "apps/web");
    const source = await fixture(t);
    await mkdir(cwd, { recursive: true });
    const { cp } = await import("node:fs/promises");
    await cp(source, cwd, { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ private: true, packageManager: "pnpm@10.0.0" }),
    );
    await writeFile(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - apps/*\n",
    );
    if (withLock)
      await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(join(root, "package-lock.json"), "{}");
    assert.equal((await addChat({ cwd, dryRun: true })).manager, "pnpm");
    assert.ok(!(await readdir(cwd)).includes("package-lock.json"));
  }
});
test("inherits Yarn workspace lockfiles and honors explicit app package managers", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "agentdock-workspace-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = join(root, "apps/web");
  await mkdir(cwd, { recursive: true });
  const { cp } = await import("node:fs/promises");
  await cp(await fixture(t), cwd, { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["apps/*"] }),
  );
  await writeFile(join(root, "yarn.lock"), "# workspace\n");
  assert.equal((await addChat({ cwd, dryRun: true })).manager, "yarn");
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies, packageManager: "bun@1.0.0" }),
  );
  assert.equal((await addChat({ cwd, dryRun: true })).manager, "bun");
});
