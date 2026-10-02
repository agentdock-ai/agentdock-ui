import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  resolve: {
    alias:
      process.env.AGENTDOCK_PRIMITIVE === "base"
        ? ["collapsible", "dropdown-menu"].map((name) => ({
            find: new RegExp(`\\.\\./ui/${name}\\.js$`),
            replacement: fileURLToPath(
              new URL(`./registry/ui/${name}.base.tsx`, import.meta.url),
            ),
          }))
        : [],
  },
  plugins: [react(), tailwind()],
  server: { host: "127.0.0.1", port: 5180, fs: { allow: ["../.."] } },
});
