import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { addChat } from "../../packages/cli/dist/commands/add.js";
const repo = fileURLToPath(new URL("../../", import.meta.url));
const runRoot = await mkdtemp(resolve(tmpdir(), "agentdock-consumer-"));
// Keep both framework installs and the real CLI's dependency installs isolated.
process.env.npm_config_cache = resolve(runRoot, "npm-cache");
process.env.npm_config_registry = "https://registry.npmjs.org";
process.env.npm_config_fetch_retries = "0";
process.env.npm_config_fetch_timeout = "30000";
try {
  const artifacts = resolve(runRoot, "artifacts");
  await mkdir(artifacts);
  async function run(command, args, cwd) {
    await new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: "1",
        },
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolvePromise()
          : reject(new Error(`${command} failed (${code})`)),
      );
    });
  }
  async function pack(path) {
    await run(
      "npm",
      ["pack", "--ignore-scripts", "--pack-destination", artifacts, "--silent"],
      path,
    );
    const pkg = JSON.parse(
      await readFile(resolve(path, "package.json"), "utf8"),
    );
    return `file:${resolve(artifacts, pkg.name.replace(/^@/, "").replaceAll("/", "-") + `-${pkg.version}.tgz`)}`;
  }
  const core = await pack(resolve(repo, "packages/ui-core"));
  const react = await pack(resolve(repo, "packages/react"));
  const contracts = await pack(
    resolve(repo, "../agentdock/packages/contracts"),
  );
  const hostTheme = (
    await readFile(resolve(repo, "apps/registry/review/theme.css"), "utf8")
  )
    .split("\n")
    .filter((line) => !line.includes("@fontsource"))
    .join("\n");
  const adapter = `import {AGENT_EVENT_PROTOCOL_VERSION} from "@agentdock-ai/contracts";const adapter: ChatAdapter = { async *sendMessage() { yield {protocolVersion:AGENT_EVENT_PROTOCOL_VERSION,eventId:"start",runId:"consumer",logicalSequence:1,phaseId:"phase",sequence:1,timestamp:"2026-09-30T00:00:00Z",type:"run.started"}; yield {protocolVersion:AGENT_EVENT_PROTOCOL_VERSION,eventId:"end",runId:"consumer",logicalSequence:2,phaseId:"phase",sequence:2,timestamp:"2026-09-30T00:00:01Z",type:"run.completed",finishReason:"stop",content:[]}; } };`;
  const outcomes = [];
  for (const framework of ["vite", "next"]) {
    const cwd = resolve(runRoot, framework);
    await mkdir(resolve(cwd, "src"), { recursive: true });
    const pkg = {
      name: `agentdock-${framework}-consumer`,
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@agentdock-ai/react": react,
        "@agentdock-ai/ui-core": core,
        "@agentdock-ai/contracts": contracts,
        react: "^19.3.0",
        "react-dom": "^19.3.0",
        ...(framework === "next" ? { next: "^16.0.0" } : {}),
      },
      devDependencies: {
        typescript: "^5.8.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.3.0",
        "@types/node": "^26.0.0",
        tailwindcss: "^4.3.0",
        ...(framework === "vite"
          ? {
              vite: "^8.3.0",
              "@vitejs/plugin-react": "^6.1.1",
              "@tailwindcss/vite": "^4.3.0",
            }
          : { "@tailwindcss/postcss": "^4.3.0" }),
      },
      overrides: {
        "@agentdock-ai/ui-core": core,
        "@agentdock-ai/contracts": contracts,
      },
    };
    await writeFile(resolve(cwd, "package.json"), JSON.stringify(pkg, null, 2));
    const config = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts"],
    };
    await writeFile(
      resolve(cwd, "tsconfig.json"),
      JSON.stringify(config, null, 2),
    );
    if (framework === "vite") {
      await writeFile(resolve(cwd, "src/index.css"), hostTheme);
      await writeFile(
        resolve(cwd, "index.html"),
        '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      );
      await writeFile(
        resolve(cwd, "vite.config.ts"),
        'import {defineConfig} from "vite";import react from "@vitejs/plugin-react";import tailwind from "@tailwindcss/vite";export default defineConfig({plugins:[react(),tailwind()]});',
      );
      await writeFile(
        resolve(cwd, "src/main.tsx"),
        `import React from "react";import {createRoot} from "react-dom/client";import type {ChatAdapter} from "@agentdock-ai/react";import {Chat} from "./components/agentdock-ui/chat";import "./index.css";${adapter} createRoot(document.getElementById("root")!).render(<div style={{height:"100dvh"}}><Chat adapter={adapter}/></div>);`,
      );
    } else {
      await mkdir(resolve(cwd, "src/app"));
      await writeFile(resolve(cwd, "src/app/globals.css"), hostTheme);
      await writeFile(
        resolve(cwd, "src/app/layout.tsx"),
        'import "./globals.css";import type {ReactNode} from "react";export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>;}',
      );
      await writeFile(
        resolve(cwd, "src/app/page.tsx"),
        `"use client";import type {ChatAdapter} from "@agentdock-ai/react";import {Chat} from "@/components/agentdock-ui/chat";${adapter}export default function Page(){return <main style={{height:"100dvh"}}><Chat adapter={adapter}/></main>;}`,
      );
      await writeFile(
        resolve(cwd, "postcss.config.mjs"),
        'export default {plugins:{"@tailwindcss/postcss":{}}};',
      );
      await writeFile(
        resolve(cwd, "components.json"),
        JSON.stringify(
          {
            $schema: "https://ui.shadcn.com/schema.json",
            style: "base-nova",
            rsc: true,
            tsx: true,
            tailwind: {
              css: "src/app/globals.css",
              baseColor: "neutral",
              cssVariables: true,
            },
            aliases: {
              components: "@/components",
              ui: "@/components/ui",
              utils: "@/lib/utils",
            },
          },
          null,
          2,
        ),
      );
    }
    await run("npm", ["install", "--no-audit", "--no-fund"], cwd);
    const before = (await readdir(cwd)).sort();
    await addChat({ cwd, yes: true, dryRun: true });
    assert.deepEqual((await readdir(cwd)).sort(), before);
    const first = await addChat({ cwd, yes: true });
    assert.equal(first.flavor, framework === "next" ? "base" : "radix");
    const chat = resolve(cwd, "src/components/agentdock-ui/chat.tsx");
    await writeFile(
      chat,
      (await readFile(chat, "utf8")) +
        "\n// Consumer customization preserved\n",
    );
    const repeated = await addChat({ cwd, yes: true });
    assert.equal(repeated.copied.length, 0);
    assert.equal(repeated.dependencies.length, 0);
    assert.ok(
      (await readFile(chat, "utf8")).includes(
        "Consumer customization preserved",
      ),
    );
    await run("npm", ["exec", "tsc", "--", "--noEmit"], cwd);
    await run(
      "npm",
      framework === "vite"
        ? ["exec", "vite", "--", "build"]
        : ["exec", "next", "--", "build", "--webpack"],
      cwd,
    );
    outcomes.push({
      framework,
      flavor: first.flavor,
      copied: first.copied.length,
      repeatWrites: repeated.copied.length,
      repeatDependencies: repeated.dependencies.length,
    });
  }
  console.log(JSON.stringify(outcomes, null, 2));
} finally {
  await rm(runRoot, { recursive: true, force: true });
}
