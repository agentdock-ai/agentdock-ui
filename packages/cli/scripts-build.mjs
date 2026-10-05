import { cp, mkdir } from "node:fs/promises";
await mkdir(new URL("./dist/registry/", import.meta.url), { recursive: true });
for (const flavor of ["radix", "base"])
  await cp(
    new URL(
      `../../apps/registry/public/r/chat-${flavor}.json`,
      import.meta.url,
    ),
    new URL(`./dist/registry/chat-${flavor}.json`, import.meta.url),
  );
