import { serveAgent, agentEventStateSchema } from "@agentdock-ai/agentdock";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "@langchain/openrouter";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { createSandboxTools } from "./sandbox-tools.js";

const SANDBOX_DIRECTORY = new URL("../.sandbox/", import.meta.url);
const MAX_REQUEST_BYTES = 32_000;
type Provider = "openrouter" | "openai" | "ollama";
type KeyedProvider = Exclude<Provider, "ollama">;
type AgentConfig =
  | { provider: "openrouter"; model: string; apiKey: string }
  | { provider: "openai"; model: string; apiKey: string }
  | { provider: "ollama"; model: string; baseUrl?: string };

export interface PlaygroundServerOptions {
  apiKey?: string;
  apiKeys?: Partial<Record<KeyedProvider, string>>;
  model: string;
  openAIModel?: string;
  ollamaModel?: string;
  ollamaBaseUrl?: string;
}

export function agentDockPlaygroundPlugin(
  options: PlaygroundServerOptions,
): Plugin {
  const keys = {
    openrouter: options.apiKeys?.openrouter ?? options.apiKey,
    openai: options.apiKeys?.openai,
  };
  const rememberedKeys: Partial<Record<KeyedProvider, string>> = {
    openrouter: keys.openrouter?.trim(),
    openai: keys.openai?.trim(),
  };
  const models: Record<Provider, string> = {
    openrouter: options.model,
    openai: options.openAIModel ?? "gpt-5.4-mini",
    ollama: options.ollamaModel ?? "llama3.3",
  };
  let config: AgentConfig | undefined = rememberedKeys.openrouter
    ? {
        provider: "openrouter",
        model: models.openrouter,
        apiKey: rememberedKeys.openrouter,
      }
    : undefined;
  let runtime: ReturnType<typeof createRuntime> | undefined;

  const checkpointer = new MemorySaver();

  function createRuntime() {
    if (!config) throw new Error("Connect a provider before starting a run.");
    const model = createModel(config);
    const graph = createAgent({
      model,
      tools: createSandboxTools(fileURLToPath(SANDBOX_DIRECTORY)),
      stateSchema: agentEventStateSchema,
      checkpointer,
      systemPrompt: [
        "You are the AgentDock UI playground agent. Use the provided tools for file requests and never claim a tool ran unless its result confirms it.",
        "All file paths must stay inside .sandbox. Prefer checkOnly=true before running new scripts.",
      ].join("\n"),
    }).graph;
    return serveAgent(graph, { recursionLimit: 12 });
  }

  function getRuntime() {
    runtime ??= createRuntime();
    return runtime;
  }

  return {
    name: "agentdock-playground-server",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost")
          .pathname;
        if (pathname === "/api/health" && request.method === "GET") {
          writeJson(response, 200, {
            configured: Boolean(config),
            provider: config?.provider ?? "openrouter",
            model: config?.model ?? models.openrouter,
            credentialsAvailable: {
              openrouter: Boolean(rememberedKeys.openrouter),
              openai: Boolean(rememberedKeys.openai),
              ollama: true,
            },
          });
          return;
        }
        if (pathname === "/api/configure") {
          if (request.method !== "POST") {
            writeJson(response, 405, {
              error: "Use POST to configure the agent.",
            });
            return;
          }
          try {
            const body = await readRequestJson(request);
            const provider = body.provider;
            if (
              provider !== "openrouter" &&
              provider !== "openai" &&
              provider !== "ollama"
            )
              throw new Error("Choose a supported provider.");
            const model = requireText(body.model, "model");
            if (model.length > 200) throw new Error("Model name is too long.");
            const enteredKey =
              typeof body.apiKey === "string" ? body.apiKey.trim() : "";
            if (enteredKey.length > 4_096)
              throw new Error("API key is too long.");
            let next: AgentConfig;
            if (provider === "ollama") {
              next = {
                provider,
                model,
                ...(options.ollamaBaseUrl?.trim()
                  ? { baseUrl: options.ollamaBaseUrl.trim() }
                  : {}),
              };
            } else {
              const apiKey = enteredKey || rememberedKeys[provider];
              if (!apiKey)
                throw new Error(
                  `Add an ${provider === "openai" ? "OpenAI" : "OpenRouter"} API key to connect.`,
                );
              rememberedKeys[provider] = apiKey;
              next = { provider, model, apiKey };
            }
            config = next;
            runtime = undefined;
            writeJson(response, 200, { configured: true, provider, model });
          } catch (error) {
            writeJson(response, 400, { error: safeMessage(error) });
          }
          return;
        }
        if (pathname !== "/api/agent/stream") return next();
        if (request.method !== "POST") {
          writeJson(response, 405, {
            error: "Use POST to start an agent run.",
          });
          return;
        }

        try {
          if (!config) {
            writeJson(response, 503, {
              error: "Connect a provider before starting a run.",
            });
            return;
          }
          const body = await readRequestJson(request);
          const prompt = requireText(body.prompt, "prompt");
          const sessionId = requireText(body.sessionId, "sessionId");
          if (prompt.length > 12_000 || sessionId.length > 128)
            throw new Error("Request values exceed their allowed length.");
          await getRuntime().pipe(response, {
            threadId: sessionId,
            input: { messages: [{ role: "user", content: prompt }] },
          });
        } catch (error) {
          if (!response.headersSent)
            writeJson(response, 400, { error: safeMessage(error) });
          else if (!response.destroyed) response.end();
        }
      });
    },
  };
}

function createModel(config: AgentConfig): BaseChatModel {
  if (config.provider === "openrouter") {
    return new ChatOpenRouter({
      model: config.model,
      apiKey: config.apiKey,
      temperature: 0,
    });
  }
  if (config.provider === "openai") {
    return new ChatOpenAI({
      model: config.model,
      apiKey: config.apiKey,
      temperature: 0,
    });
  }
  return new ChatOllama({
    model: config.model,
    baseUrl: config.baseUrl,
    temperature: 0,
  });
}

async function readRequestJson(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_REQUEST_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Request body must be a JSON object.");
  return parsed as Record<string, unknown>;
}
function requireText(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${name} must be a non-empty string.`);
  return value.trim();
}
function writeJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}
function safeMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 1_000)
    : "The playground agent request failed.";
}
