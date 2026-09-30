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
