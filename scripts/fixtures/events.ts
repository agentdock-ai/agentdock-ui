import type { AgentEvent, AgentEventInput } from "@agentdock-ai/contracts";
import { AGENT_EVENT_PROTOCOL_VERSION } from "@agentdock-ai/contracts";

export function sequence(
  inputs: readonly AgentEventInput[],
  runId = "fixture-run",
  phaseId = "phase-1",
  offset = 0,
): AgentEvent[] {
  return inputs.map((input, i) => ({
    protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
    eventId: `${runId}:${offset + i + 1}`,
    runId,
    phaseId,
    logicalSequence: offset + i + 1,
    sequence: offset + i + 1,
    timestamp: new Date(Date.UTC(2026, 8, 30, 12, 0, offset + i)).toISOString(),
    ...input,
  }));
}
export const call = {
  toolCallId: "read-1",
  name: "read_file",
  input: { path: "src/app.tsx" },
};
export const call2 = {
  toolCallId: "read-2",
  name: "read_file",
  input: { path: "src/theme.css" },
};
export const markdown =
  "Here’s a compact starting point.\n\n### Keep the interface focused\n\n- Give the answer room to breathe.\n- Keep activity available in a disclosure.\n- Make the next action clear.\n\n```tsx\n<Chat adapter={chatAdapter} />\n```\n\n| Surface | Treatment |\n| --- | --- |\n| Messages | Open, readable text |\n| Tools | Compact disclosures |\n\nSee the [integration guide](https://example.com/guide) for more.";
export const intro: AgentEventInput[] = [
  { type: "run.started" },
  { type: "message.started", messageId: "answer", role: "assistant" },
];
export const text = (value: string): AgentEventInput => ({
  type: "message.part.delta",
  messageId: "answer",
  part: { type: "text", text: value },
});
export const complete = (value: string): AgentEventInput => ({
  type: "run.completed",
  finishReason: "stop",
  content: [{ type: "text", text: value }],
});
export const scenarios = {
  empty: [],
  long: sequence([
    ...intro,
    text(
      markdown +
        "\n\n" +
        Array.from(
          { length: 28 },
          (_, i) =>
            `### Detail ${i + 1}\n\nA calm interface gives long answers a readable measure and keeps the composer available. [A very long link](https://example.com/` +
            "segment/".repeat(30) +
            `) stays inside the content column.\n\n`,
        ).join(""),
    ),
    complete(
      markdown +
        "\n\n" +
        Array.from(
          { length: 28 },
          (_, i) =>
            `### Detail ${i + 1}\n\nA calm interface gives long answers a readable measure and keeps the composer available. [A very long link](https://example.com/` +
            "segment/".repeat(30) +
            `) stays inside the content column.\n\n`,
        ).join(""),
    ),
  ]),
  fallbacks: sequence([
    ...intro,
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "<script>alert(1)</script>\n\n[Unsafe link](javascript:alert(1))",
        },
        { type: "image", fileId: "image-1" },
        { type: "file", fileId: "file-1", name: "notes.txt" },
        { type: "audio", fileId: "audio-1" },
        { type: "video", fileId: "video-1" },
        {
          type: "citation",
          url: "https://example.com/source",
          title: "Source",
        },
        {
          type: "custom",
          name: "Extra context",
          data: { note: "Preserved safely" },
        },
      ],
    },
    { type: "run.completed", finishReason: "stop", content: [] },
  ]),
  conversation: sequence([
    ...intro,
    text(
      "A good chat interface makes the conversation easy to follow. Keep the answer readable, the controls quiet, and the next step clear.",
    ),
    complete(
      "A good chat interface makes the conversation easy to follow. Keep the answer readable, the controls quiet, and the next step clear.",
    ),
  ]),
  markdown: sequence([
    ...intro,
    text(markdown),
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [{ type: "text", text: markdown }],
    },
    {
      type: "usage.updated",
      usage: { inputTokens: 40, outputTokens: 90, totalTokens: 130 },
    },
    complete(markdown),
  ]),
  streaming: sequence([
    ...intro,
    text(
      "I’m putting together a small, readable interface. The conversation stays at the center, with",
    ),
  ]),
  reasoning: sequence([
    ...intro,
    {
      type: "message.part.delta",
      messageId: "answer",
      part: {
        type: "reasoning",
        text: "I’ll check the message hierarchy first, then look at the composer and keyboard behavior.",
      },
    },
  ]),
  tools: sequence([
    ...intro,
    text("I’ll check the existing components."),
    { type: "tool.called", toolCall: call },
    { type: "tool.called", toolCall: call2 },
    {
      type: "tool.progress",
      toolCallId: call.toolCallId,
      content: [{ type: "text", text: "Reading the component source…" }],
    },
    {
      type: "tool.completed",
      result: {
        ...call,
        output: "The component uses semantic tokens and a single adapter.",
      },
    },
    {
      type: "tool.completed",
      result: {
        ...call2,
        output: "Light and dark colors are defined by the host.",
      },
    },
    text("The structure looks good. Both files use the host’s theme tokens."),
    complete(
      "I’ll check the existing components.The structure looks good. Both files use the host’s theme tokens.",
    ),
  ]),
  approval: sequence([
    ...intro,
    { type: "tool.called", toolCall: call },
    {
      type: "interrupt.required",
      interrupt: {
        interruptId: "decision-1",
        kind: "tool-approval",
        prompt: "Allow the agent to read src/app.tsx to review the component?",
        actions: [
          {
            id: "allow",
            name: "Allow once",
            toolCallId: call.toolCallId,
            input: { decision: "allow", toolCallId: call.toolCallId },
          },
          {
            id: "skip",
            name: "Skip this step",
            toolCallId: call.toolCallId,
            input: { decision: "skip", toolCallId: call.toolCallId },
          },
        ],
      },
    },
  ]),
  error: sequence([
    ...intro,
    text("I’ve saved the outline so far."),
    {
      type: "run.failed",
      code: "fixture_unavailable",
      message:
        "The agent is temporarily unavailable. Your partial answer is preserved.",
    },
  ]),
  toolError: sequence([
    ...intro,
    { type: "tool.called", toolCall: call },
    {
      type: "tool.completed",
      result: {
        ...call,
        output: "The file could not be found.",
        isError: true,
      },
    },
    complete("I couldn’t find that file. Check the path and try again."),
  ]),
  toolFailed: sequence([
    ...intro,
    { type: "tool.called", toolCall: call },
    {
      type: "tool.failed",
      error: {
        ...call,
        code: "not_found",
        error: "The file could not be found.",
      },
    },
    complete("Check the file path and try again."),
  ]),
  stopped: sequence([
    ...intro,
    text(
      "Here’s the first part of the outline. The rest can wait until you’re ready.",
    ),
    { type: "run.cancelled", reason: "Requested by user" },
  ]),
  thinking: sequence([{ type: "run.started" }]),
  toolMessage: sequence([
    { type: "run.started" },
    { type: "message.started", messageId: "tool-output", role: "tool" },
    {
      type: "message.part.delta",
      messageId: "tool-output",
      part: {
        type: "text",
        text: "Tool input failed.\n    at Tool.call (file:///private/runtime.js:10:1)",
      },
    },
    {
      type: "message.completed",
      messageId: "tool-output",
      role: "tool",
      content: [
        {
          type: "text",
          text: "Tool input failed.\n    at Tool.call (file:///private/runtime.js:10:1)",
        },
      ],
    },
    complete("Check the input and try again."),
  ]),
} satisfies Record<string, AgentEvent[]>;
export type Scenario = keyof typeof scenarios;
