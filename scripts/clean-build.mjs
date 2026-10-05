import { rm } from "node:fs/promises";

// Remove obsolete emitted files before creating the package surface.
await rm("dist", { recursive: true, force: true });
