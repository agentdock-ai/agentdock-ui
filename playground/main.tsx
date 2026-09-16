import React, { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { AgentChatView } from "../src/components/chat/agent-chat-view.js";
import { AgentDockTheme } from "../src/components/ui/theme.js";
import { AgentStore } from "../src/core/agent-store.js";
import { consumeAgentStream } from "../src/core/consume-agent-stream.js";
import { decodeAgentEventStream } from "../src/core/decode-agent-event-stream.js";
import { AgentProvider } from "../src/react/agent-provider.js";
import "./style.css";

const store = new AgentStore();
const sessionId = `playground-${crypto.randomUUID()}`;
const providers = [
  { id: "openrouter", label: "OpenRouter", requiresKey: true },
  { id: "openai", label: "OpenAI", requiresKey: true },
  { id: "ollama", label: "Ollama", requiresKey: false },
] as const;
type Provider = (typeof providers)[number]["id"];
const models: Record<Provider, { id: string; label: string }[]> = {
  openrouter: [
    { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
    { id: "openai/gpt-4.1", label: "GPT-4.1" },
    { id: "deepseek/deepseek-v4-flash-0731", label: "DeepSeek V4 Flash" },
  ],
  openai: [
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    { id: "gpt-4.1", label: "GPT-4.1" },
  ],
  ollama: [
    { id: "llama3.3", label: "Llama 3.3" },
    { id: "qwen3", label: "Qwen 3" },
  ],
};
const customModel = "__custom";

interface Health {
  configured?: boolean;
  provider?: Provider;
  model?: string;
  credentialsAvailable?: Partial<Record<Provider, boolean>>;
}
function isProvider(value: unknown): value is Provider {
  return value === "openrouter" || value === "openai" || value === "ollama";
}

function Playground() {
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [modelOption, setModelOption] = useState(models.openrouter[0]!.id);
  const [customModelName, setCustomModelName] = useState("");
  const [key, setKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [envKeys, setEnvKeys] = useState<Partial<Record<Provider, boolean>>>(
    {},
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const model =
    modelOption === customModel ? customModelName.trim() : modelOption;
  const selectedProvider = providers.find((item) => item.id === provider)!;

  useEffect(() => {
    let live = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((health: Health) => {
        if (!live) return;
        const p = isProvider(health.provider) ? health.provider : "openrouter";
        const m = health.model ?? models.openrouter[0]!.id;
        setProvider(p);
        setModelOption(
          models[p].some((option) => option.id === m) ? m : customModel,
        );
        setCustomModelName(
          models[p].some((option) => option.id === m) ? "" : m,
        );
        setConfigured(Boolean(health.configured));
        setEnvKeys(health.credentialsAvailable ?? {});
      })
      .catch(() => {
        if (live) setError("Could not reach the local agent.");
      });
    return () => {
      live = false;
    };
  }, []);

  function selectProvider(next: Provider) {
    setProvider(next);
    setModelOption(models[next][0]!.id);
    setCustomModelName("");
    setKey("");
    setConfigured(false);
    setError("");
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model || connecting) return;
    setConnecting(true);
    setError("");
    try {
      const response = await fetch("/api/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey: key }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Could not connect this provider.");
      setKey("");
      setConfigured(true);
    } catch (cause) {
      setConfigured(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not connect this provider.",
      );
    } finally {
      setConnecting(false);
    }
  }

  async function send(prompt: string) {
    const response = await fetch("/api/agent/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sessionId }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(
        body.error ?? `Agent request failed (${response.status}).`,
      );
    }
    if (!response.body)
      throw new Error("The agent response did not include a stream.");
    await consumeAgentStream(store, decodeAgentEventStream(response.body));
  }

  const keyMissing =
    selectedProvider.requiresKey && !key.trim() && !envKeys[provider];
  return (
    <main className="playground">
      <form className="provider-form" onSubmit={connect}>
        <select
          aria-label="Provider"
          value={provider}
          onChange={(event) => selectProvider(event.target.value as Provider)}
        >
          {providers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Model"
          value={modelOption}
          onChange={(event) => {
            setModelOption(event.target.value);
            setCustomModelName("");
            setConfigured(false);
          }}
        >
          {models[provider].map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          <option value={customModel}>Custom model…</option>
        </select>
        {modelOption === customModel && (
          <input
            aria-label="Model ID"
            placeholder="Model ID"
            value={customModelName}
            onChange={(event) => {
              setCustomModelName(event.target.value);
              setConfigured(false);
            }}
          />
        )}
        {selectedProvider.requiresKey && (
          <input
            aria-label={`${selectedProvider.label} API key`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={envKeys[provider] ? "API key from .env" : "API key"}
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setConfigured(false);
            }}
          />
        )}
        <button type="submit" disabled={connecting || !model || keyMissing}>
          {connecting ? "Connecting…" : configured ? "Connected" : "Connect"}
        </button>
      </form>
      {error && (
        <p className="configuration-error" role="alert">
          {error}
        </p>
      )}
      <AgentChatView
        disabled={!configured}
        onSubmit={send}
        placeholder={
          configured ? "Message your agent…" : "Connect a provider to start…"
        }
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AgentDockTheme mode="light">
      <AgentProvider store={store}>
        <Playground />
      </AgentProvider>
    </AgentDockTheme>
  </React.StrictMode>,
);
