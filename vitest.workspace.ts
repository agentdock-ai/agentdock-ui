import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/ui-core/vitest.config.ts",
  "packages/react/vitest.config.ts",
  "apps/playground/vitest.config.ts",
]);
