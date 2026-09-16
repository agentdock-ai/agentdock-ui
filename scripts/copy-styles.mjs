import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "src/styles.css");
const destination = resolve(root, "dist/styles.css");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
