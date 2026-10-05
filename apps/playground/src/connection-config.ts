export type Provider = "openrouter" | "openai" | "ollama";
export interface PersistedPlaygroundConfig {
  provider: Provider;
  model: string;
  apiKey?: string;
}
export interface Health {
  configured: boolean;
  provider?: Provider;
  model?: string;
  credentialsAvailable: Partial<Record<Provider, boolean>>;
}
export function isProvider(value: unknown): value is Provider {
  return value === "openrouter" || value === "openai" || value === "ollama";
}
export function persistedConfig(
  value: unknown,
): PersistedPlaygroundConfig | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("provider" in value) ||
    !isProvider(value.provider) ||
    !("model" in value) ||
    typeof value.model !== "string" ||
    !value.model.trim()
  )
    return null;
  return {
    provider: value.provider,
    model: value.model.trim(),
    apiKey:
      "apiKey" in value && typeof value.apiKey === "string"
        ? value.apiKey.trim()
        : undefined,
  };
}
export function healthResponse(value: unknown): Health {
  if (
    !value ||
    typeof value !== "object" ||
    !("configured" in value) ||
    typeof value.configured !== "boolean"
  )
    throw new Error("The local agent returned an invalid health response.");
  const provider =
    "provider" in value && isProvider(value.provider)
      ? value.provider
      : undefined;
  const model =
    "model" in value && typeof value.model === "string" && value.model.trim()
      ? value.model
      : undefined;
  if (value.configured && (!provider || !model))
    throw new Error(
      "The local agent returned an invalid provider configuration.",
    );
  const credentialsAvailable: Health["credentialsAvailable"] = {};
  if ("credentialsAvailable" in value) {
    const credentials = value.credentialsAvailable;
    if (
      !credentials ||
      typeof credentials !== "object" ||
      Array.isArray(credentials)
    )
      throw new Error(
        "The local agent returned invalid credential availability.",
      );
    for (const [key, available] of Object.entries(credentials)) {
      if (!isProvider(key) || typeof available !== "boolean")
        throw new Error(
          "The local agent returned invalid credential availability.",
        );
      credentialsAvailable[key] = available;
    }
  }
  return {
    configured: value.configured,
    provider,
    model,
    credentialsAvailable,
  };
}
