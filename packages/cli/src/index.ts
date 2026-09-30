#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { addChat } from "./commands/add.js";
const args = process.argv.slice(2);
const help =
  "Usage: agentdock-ui add chat [--cwd <directory>] [--dry-run] [--yes] [--overwrite]";
async function main() {
  if (args.includes("--help") || args.length === 0) {
    console.log(help);
    return;
  }
  if (args[0] !== "add" || args[1] !== "chat") throw new Error(help);
  let cwd = process.cwd();
  for (let i = 2; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--cwd") {
      if (!args[i + 1] || args[i + 1]!.startsWith("--"))
        throw new Error("--cwd requires a directory.");
      cwd = args[++i]!;
    } else if (!["--dry-run", "--yes", "-y", "--overwrite"].includes(arg))
      throw new Error(`Unknown option: ${arg}\n${help}`);
  }
  const result = await addChat({
    cwd,
    dryRun: args.includes("--dry-run"),
    yes: args.includes("--yes") || args.includes("-y"),
    overwrite: args.includes("--overwrite"),
    confirm: process.stdin.isTTY
      ? async (message) => {
          const prompt = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          try {
            return /^(y|yes)$/i.test(
              (await prompt.question(`${message} [y/N] `)).trim(),
            );
          } finally {
            prompt.close();
          }
        }
      : undefined,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!args.includes("--dry-run"))
    console.log(
      `Chat source is ready in ${result.destination}. Render <Chat adapter={chatAdapter} /> in a bounded-height container.`,
    );
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Installation failed.",
  );
  process.exitCode = 1;
});
