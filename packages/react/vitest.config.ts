import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/index.ts", "src/react/chat-adapter.ts"],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 93,
        functions: 100,
        lines: 100,
      },
      reporter: ["text", "json-summary", "html"],
    },
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
