import { AgentDock } from "@agentdock-ai/agentdock";
import { AgentDockModel } from "@agentdock-ai/models";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { createSandboxTools } from "./sandbox-tools.js";

const SANDBOX_DIRECTORY = new URL("./.sandbox/", import.meta.url);
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

export function agentDockPlaygroundPlugin(options: PlaygroundServerOptions): Plugin {
  const keys = { openrouter: options.apiKeys?.openrouter ?? options.apiKey, openai: options.apiKeys?.openai };
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
    ? { provider: "openrouter", model: models.openrouter, apiKey: rememberedKeys.openrouter }
    : undefined;
  let agent: AgentDock | undefined;

  function getAgent() {
    if (!config) throw new Error("Connect a provider before starting a run.");
    if (!agent) {
      const model = config.provider === "openrouter"
        ? AgentDockModel.openRouter({ model: config.model, apiKey: config.apiKey, temperature: 0 })
        : config.provider === "openai"
          ? AgentDockModel.openAI({ model: config.model, apiKey: config.apiKey, temperature: 0 })
          : AgentDockModel.ollama({ model: config.model, baseUrl: config.baseUrl, temperature: 0 });
      agent = new AgentDock({
        model,
        defaults: {
          maxSteps: 8,
          systemPrompt: [
            "You are the AgentDock UI playground agent. Use the provided tools for file requests and never claim a tool ran unless its result confirms it.",
            "All file paths must stay inside .sandbox. Prefer checkOnly=true before running new scripts.",
          ].join("\n"),
        },
      });
      agent.registerTools(createSandboxTools(fileURLToPath(SANDBOX_DIRECTORY)));
    }
    return agent;
  }

  return {
    name: "agentdock-playground-server",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname === "/api/health" && request.method === "GET") {
          writeJson(response, 200, {
            configured: Boolean(config),
            provider: config?.provider ?? "openrouter",
            model: config?.model ?? models.openrouter,
            credentialsAvailable: { openrouter: Boolean(rememberedKeys.openrouter), openai: Boolean(rememberedKeys.openai), ollama: true },
          });
          return;
        }
        if (pathname === "/api/configure") {
          if (request.method !== "POST") { writeJson(response, 405, { error: "Use POST to configure the agent." }); return; }
          try {
            const body = await readRequestJson(request);
            const provider = body.provider;
            if (provider !== "openrouter" && provider !== "openai" && provider !== "ollama") throw new Error("Choose a supported provider.");
            const model = requireText(body.model, "model");
            if (model.length > 200) throw new Error("Model name is too long.");
            const enteredKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
            if (enteredKey.length > 4_096) throw new Error("API key is too long.");
            let next: AgentConfig;
            if (provider === "ollama") {
              next = { provider, model, ...(options.ollamaBaseUrl?.trim() ? { baseUrl: options.ollamaBaseUrl.trim() } : {}) };
            } else {
              const apiKey = enteredKey || rememberedKeys[provider];
              if (!apiKey) throw new Error(`Add an ${provider === "openai" ? "OpenAI" : "OpenRouter"} API key to connect.`);
              rememberedKeys[provider] = apiKey;
              next = { provider, model, apiKey };
            }
            config = next;
            agent = undefined;
            writeJson(response, 200, { configured: true, provider, model });
          } catch (error) { writeJson(response, 400, { error: safeMessage(error) }); }
          return;
        }
        if (pathname !== "/api/agent/stream") return next();
        if (request.method !== "POST") { writeJson(response, 405, { error: "Use POST to start an agent run." }); return; }

        let abortController: AbortController | undefined;
        try {
          if (!config) { writeJson(response, 503, { error: "Connect a provider before starting a run." }); return; }
          const body = await readRequestJson(request);
          const prompt = requireText(body.prompt, "prompt");
          const sessionId = requireText(body.sessionId, "sessionId");
          if (prompt.length > 12_000 || sessionId.length > 128) throw new Error("Request values exceed their allowed length.");
          abortController = new AbortController();
          const execution = await getAgent().stream(prompt, {}, { sessionId, abortSignal: abortController.signal });
          response.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Content-Type-Options": "nosniff" });
          response.on("close", () => { if (!response.writableEnded) abortController?.abort(new Error("Browser disconnected.")); });
          try {
            for await (const event of execution.stream) await writeChunk(response, `${JSON.stringify(event)}\n`);
            await execution.result;
            response.end();
          } catch (error) {
            if (!response.destroyed) {
              await writeChunk(response, `${JSON.stringify({ type: "agentdock.transport.error", message: safeMessage(error) })}\n`).catch(() => undefined);
              response.end();
            }
          }
        } catch (error) {
          if (!response.headersSent) writeJson(response, 400, { error: safeMessage(error) });
          else if (!response.destroyed) response.end();
        }
      });
    },
  };
}

async function readRequestJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_REQUEST_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Request body must be valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Request body must be a JSON object.");
  return parsed as Record<string, unknown>;
}
function requireText(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string.`);
  return value.trim();
}
function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(JSON.stringify(value));
}
async function writeChunk(response: ServerResponse, chunk: string): Promise<void> {
  if (response.destroyed || response.writableEnded) throw new Error("Browser disconnected.");
  if (response.write(chunk)) return;
  await new Promise<void>((resolve, reject) => {
    const onDrain = () => { cleanup(); resolve(); };
    const onClose = () => { cleanup(); reject(new Error("Browser disconnected.")); };
    const cleanup = () => { response.off("drain", onDrain); response.off("close", onClose); };
    response.once("drain", onDrain); response.once("close", onClose);
  });
}
function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 1_000) : "The playground agent request failed.";
}
