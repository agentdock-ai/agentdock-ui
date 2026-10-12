import type { ContentPart, JsonValue } from "@agentdock-ai/contracts";
import { describe, expect, it } from "vitest";
import type { RenderMessageItem } from "../src/render-model.js";
import { matchesToolOutput, toolMessageOutput } from "../src/tool-activity.js";

function message(
  ...content: Exclude<ContentPart, { type: "tool-call" | "tool-result" }>[]
): RenderMessageItem {
  return {
    id: "tool-message",
    messageId: "tool-message",
    runId: null,
    phaseId: null,
    position: 0,
    type: "message",
    role: "tool",
    state: "complete",
    blocks: content.map((part, position) => ({
      ...part,
      id: `block-${position}`,
      position,
      state: "complete",
    })),
  };
}

describe("matchesToolOutput", () => {
  it("matches exact text outputs and rejects missing or different text", () => {
    const result = message({ type: "text", text: "done" });

    expect(matchesToolOutput(result, "done")).toBe(true);
    expect(matchesToolOutput(result, "different")).toBe(false);
    expect(matchesToolOutput(result, undefined)).toBe(false);
    expect(
      matchesToolOutput(
        message(
          { type: "text", text: "done" },
          { type: "custom", name: "extra", data: null },
        ),
        "done",
      ),
    ).toBe(false);
  });

  it("matches object outputs only against matching model-content blocks", () => {
    const output = { path: "src/index.ts" };

    expect(
      matchesToolOutput(
        message({ type: "custom", name: "model-content", data: output }),
        output,
      ),
    ).toBe(true);
    expect(
      matchesToolOutput(
        message({ type: "custom", name: "other", data: output }),
        output,
      ),
    ).toBe(false);
    expect(
      matchesToolOutput(
        message({
          type: "custom",
          name: "model-content",
          data: { path: "other.ts" },
        }),
        output,
      ),
    ).toBe(false);
    expect(matchesToolOutput(message(), output)).toBe(false);
  });

  it("normalizes array outputs and rejects mismatched content", () => {
    const output: JsonValue[] = [
      { type: "text", text: "read" },
      { type: "custom", name: "file", data: { path: "a.ts" } },
    ];

    expect(
      matchesToolOutput(
        message(
          { type: "text", text: "read" },
          {
            type: "custom",
            name: "model-content",
            data: output[1],
          },
        ),
        output,
      ),
    ).toBe(true);
    expect(matchesToolOutput(message(), [])).toBe(true);
    expect(
      matchesToolOutput(message({ type: "text", text: "other" }), output),
    ).toBe(false);
    expect(matchesToolOutput(message(), null)).toBe(false);
    expect(matchesToolOutput(message(), 42)).toBe(false);
    expect(matchesToolOutput(message(), true)).toBe(false);
  });
});

describe("toolMessageOutput", () => {
  it("returns plain text and model content directly", () => {
    expect(toolMessageOutput(message({ type: "text", text: "done" }))).toBe(
      "done",
    );
    expect(
      toolMessageOutput(
        message({ type: "custom", name: "model-content", data: { ok: true } }),
      ),
    ).toEqual({ ok: true });
  });

  it("keeps mixed and empty content as normalized content arrays", () => {
    expect(
      toolMessageOutput(
        message(
          { type: "text", text: "read" },
          { type: "custom", name: "metadata", data: { ok: true } },
        ),
      ),
    ).toEqual([
      { type: "text", text: "read" },
      { type: "custom", name: "metadata", data: { ok: true } },
    ]);
    expect(toolMessageOutput(message())).toEqual([]);
  });
});
