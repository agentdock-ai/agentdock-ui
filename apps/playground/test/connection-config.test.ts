import { describe, expect, it } from "vitest";
import { persistedConfig, healthResponse } from "../src/connection-config.js";

describe("playground configuration boundaries", () => {
  it.each([
    null,
    [],
    {},
    { provider: "unknown", model: "model" },
    { provider: "openai", model: 1 },
    { provider: "openai", model: " " },
  ])("ignores invalid persisted configuration %j", (value) => {
    expect(persistedConfig(value)).toBeNull();
  });
  it("keeps one configuration shape and trims locally stored strings", () => {
    expect(
      persistedConfig({
        provider: "openai",
        model: " model ",
        apiKey: " key ",
      }),
    ).toEqual({ provider: "openai", model: "model", apiKey: "key" });
  });
  it.each([
    null,
    [],
    {},
    { configured: "true" },
    { configured: true },
    { configured: true, provider: "other", model: "m" },
    { configured: false, credentialsAvailable: null },
    { configured: false, credentialsAvailable: { openai: "yes" } },
  ])("rejects malformed health response %j", (value) => {
    expect(() => healthResponse(value)).toThrow("local agent returned");
  });
  it("accepts current health responses with and without a configured provider", () => {
    expect(healthResponse({ configured: false })).toMatchObject({
      configured: false,
      credentialsAvailable: {},
    });
    expect(
      healthResponse({
        configured: true,
        provider: "openai",
        model: "model",
        credentialsAvailable: { openai: true, ollama: false },
      }),
    ).toEqual({
      configured: true,
      provider: "openai",
      model: "model",
      credentialsAvailable: { openai: true, ollama: false },
    });
  });
});
