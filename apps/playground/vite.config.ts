import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { agentDockPlaygroundPlugin } from "./server/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwind(),
      agentDockPlaygroundPlugin({
        transcription: {
          apiKey: env.PLAYGROUND_STT_API_KEY || env.OPENAI_API_KEY,
          model: env.PLAYGROUND_STT_MODEL || env.STT_MODEL,
        },
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
