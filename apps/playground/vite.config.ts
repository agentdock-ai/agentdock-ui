import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { agentDockPlaygroundPlugin } from "./server/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      agentDockPlaygroundPlugin({
        apiKeys: {
          openrouter: env.OPENROUTER_API_KEY,
          openai: env.OPENAI_API_KEY,
        },
        model: env.OPENROUTER_MODEL?.trim() || "anthropic/claude-sonnet-4.5",
        openAIModel: env.OPENAI_MODEL,
        ollamaModel: env.OLLAMA_MODEL,
        ollamaBaseUrl: env.OLLAMA_BASE_URL,
      }),
    ],
    server: { host: "127.0.0.1" },
  };
});
