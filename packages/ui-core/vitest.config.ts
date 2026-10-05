import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/index.ts", "src/render-model.ts"],
      thresholds: {
        perFile: true,
        statements: 98,
        branches: 93,
        functions: 100,
        lines: 98,
      },
      reporter: ["text", "json-summary", "html"],
    },
    include: ["test/**/*.test.ts"],
  },
});
