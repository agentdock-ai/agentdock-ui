import React, { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  AgentChatView,
  AgentDockTheme,
  AgentProvider,
  Button,
  Input,
} from "@agentdock-ai/react";
import {
  AgentStore,
  consumeAgentStream,
  decodeAgentEventStream,
} from "@agentdock-ai/ui-core";
import "@agentdock-ai/react/styles.css";
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
const PLAYGROUND_STORAGE_KEY = "agentdock.playground.connection.v1";

interface PersistedPlaygroundConfig {
  version: 1;
  provider: Provider;
  model: string;
  apiKey?: string;
  savedAt: string;
}

interface Health {
  configured?: boolean;
  provider?: Provider;
  model?: string;
  credentialsAvailable?: Partial<Record<Provider, boolean>>;
}
function isProvider(value: unknown): value is Provider {
  return value === "openrouter" || value === "openai" || value === "ollama";
}

function readPersistedConfig(): PersistedPlaygroundConfig | null {
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedPlaygroundConfig>;
    if (
      value.version !== 1 ||
      !isProvider(value.provider) ||
      typeof value.model !== "string" ||
      !value.model.trim()
    ) {
      return null;
    }
    return {
      version: 1,
      provider: value.provider,
      model: value.model.trim(),
      apiKey: typeof value.apiKey === "string" ? value.apiKey.trim() : undefined,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistConfig(
  config: Omit<PersistedPlaygroundConfig, "version" | "savedAt">,
): void {
  try {
    window.localStorage.setItem(
      PLAYGROUND_STORAGE_KEY,
      JSON.stringify({ ...config, version: 1, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Local storage can be unavailable in privacy-restricted browser contexts.
  }
}

function Playground() {
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [modelOption, setModelOption] = useState(models.openrouter[0]!.id);
  const [customModelName, setCustomModelName] = useState("");
  const [key, setKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState("");
  const [savedKeyAvailable, setSavedKeyAvailable] = useState(false);
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
    async function initialize() {
      const persisted = readPersistedConfig();
      try {
        const response = await fetch("/api/health");
        const health = (await response.json()) as Health;
        if (!live) return;

        const p = persisted?.provider ?? (isProvider(health.provider) ? health.provider : "openrouter");
        const m = persisted?.model ?? health.model ?? models.openrouter[0]!.id;
        const knownModel = models[p].some((option) => option.id === m);
        setProvider(p);
        setModelOption(knownModel ? m : customModel);
        setCustomModelName(knownModel ? "" : m);
        setEnvKeys(health.credentialsAvailable ?? {});
        setSavedApiKey(persisted?.apiKey ?? "");
        setSavedKeyAvailable(Boolean(persisted?.apiKey));

        if (persisted) {
          setConnecting(true);
          const configureResponse = await fetch("/api/configure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: persisted.provider,
              model: persisted.model,
              apiKey: persisted.apiKey ?? "",
            }),
          });
          if (!configureResponse.ok) {
            const body = (await configureResponse.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? "The saved provider connection could not be restored.");
          }
          if (!live) return;
          setConfigured(true);
          setKey("");
        } else {
          setConfigured(Boolean(health.configured));
        }
      } catch (cause) {
        if (live) {
          setConfigured(false);
          setError(cause instanceof Error ? cause.message : "Could not reach the local agent.");
        }
      } finally {
        if (live) setConnecting(false);
      }
    }
    void initialize();
    return () => {
      live = false;
    };
  }, []);

  function selectProvider(next: Provider) {
    setProvider(next);
    setModelOption(models[next][0]!.id);
    setCustomModelName("");
    setKey("");
    setSavedApiKey("");
    setSavedKeyAvailable(false);
    setConfigured(false);
    setError("");
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model || connecting) return;
    setConnecting(true);
    setError("");
    const connectionKey = key.trim() || savedApiKey;
    try {
      const response = await fetch("/api/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey: connectionKey }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Could not connect this provider.");
      persistConfig({
        provider,
        model,
        ...(selectedProvider.requiresKey && connectionKey
          ? { apiKey: connectionKey }
          : {}),
      });
      setSavedApiKey(selectedProvider.requiresKey ? connectionKey : "");
      setSavedKeyAvailable(selectedProvider.requiresKey && Boolean(connectionKey));
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
    selectedProvider.requiresKey &&
    !key.trim() &&
    !savedKeyAvailable &&
    !envKeys[provider];
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
          <Input
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
          <Input
            aria-label={`${selectedProvider.label} API key`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              envKeys[provider]
                ? "API key from .env"
                : savedKeyAvailable
                  ? "Saved API key"
                  : "API key"
            }
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setConfigured(false);
            }}
          />
        )}
        <Button type="submit" disabled={connecting || !model || keyMissing}>
          {connecting ? "Connecting…" : configured ? "Connected" : "Connect"}
        </Button>
      </form>
      {error && (
        <p className="configuration-error" role="alert">
          {error}
        </p>
      )}
      <AgentChatView
        className="playground-chat"
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
