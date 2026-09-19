import { describe, expect, it } from "vitest";
import {
  createAgentReducerState,
  reduceAgentEvents,
  type AgentEvent,
  type AgentEventInput,
  type AgentReducerState,
  type ContentPart,
} from "@agentdock-ai/contracts";
import {
  selectRenderMessages,
  selectRenderModel,
} from "../src/select-render-messages.js";

const runId = "run-1";
const sessionId = "session-1";

function event(
  logicalSequence: number,
  input: AgentEventInput,
  options: { eventId?: string; runId?: string } = {},
): AgentEvent {
  return {
    protocolVersion: 1,
    eventId: options.eventId ?? `event-${logicalSequence}`,
    runId: options.runId ?? runId,
    sessionId,
    logicalSequence,
    phaseId: "phase-1",
    sequence: logicalSequence,
    timestamp: `2026-09-19T00:00:${String(logicalSequence).padStart(2, "0")}.000Z`,
    ...input,
  } as AgentEvent;
}

function stateFor(events: readonly AgentEvent[]): AgentReducerState {
  return reduceAgentEvents(events);
}

function startedMessageEvents(parts: ContentPart[] = [{ type: "text", text: "Hello" }]): AgentEvent[] {
  return [
    event(1, { type: "run.started" }),
    event(2, { type: "message.started", messageId: "assistant-1", role: "assistant" }),
    ...parts.map((part, index) =>
      event(3 + index, {
        type: "message.part.delta",
        messageId: "assistant-1",
        part,
      }),
    ),
  ];
}

describe("ui-core render model", () => {
  it("keeps text streaming in one stable assistant message and normalizes completed history", () => {
    const streamingEvents = [
      event(1, { type: "run.started" }),
      event(2, { type: "message.started", messageId: "assistant-1", role: "assistant" }),
      event(3, { type: "message.part.delta", messageId: "assistant-1", part: { type: "text", text: "Hel" } }),
      event(4, { type: "message.part.delta", messageId: "assistant-1", part: { type: "text", text: "lo" } }),
    ];
    const streamingState = stateFor(streamingEvents);
    const streaming = selectRenderMessages({ runs: [streamingState], events: streamingEvents });

    expect(streaming).toHaveLength(1);
    expect(streaming[0]).toMatchObject({
      id: "assistant-1",
      runId,
      role: "assistant",
      state: "streaming",
      content: [
        { type: "text", text: "Hel" },
        { type: "text", text: "lo" },
      ],
    });

    const completedEvents = [
      ...streamingEvents,
      event(5, {
        type: "message.completed",
        messageId: "assistant-1",
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
      }),
      event(6, {
        type: "run.completed",
        finishReason: "stop",
        content: [{ type: "text", text: "Hello" }],
      }),
    ];
    const completed = selectRenderMessages({
      runs: [stateFor(completedEvents)],
      events: completedEvents,
    });

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({ id: "assistant-1", state: "complete" });
    expect(completed[0]?.content).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("separates reasoning from assistant text while retaining timing", () => {
    const events = [
      ...startedMessageEvents([
        { type: "reasoning", text: "First " },
        { type: "reasoning", text: "think." },
        { type: "text", text: "Answer" },
      ]),
      event(6, {
        type: "message.completed",
        messageId: "assistant-1",
        role: "assistant",
        content: [
          { type: "reasoning", text: "First think." },
          { type: "text", text: "Answer" },
        ],
      }),
    ];
    const message = selectRenderMessages({ runs: [stateFor(events)], events })[0];

    expect(message).toMatchObject({
      state: "complete",
      content: [{ type: "text", text: "Answer" }],
      reasoning: {
        text: "First think.",
        state: "complete",
        startedAt: "2026-09-19T00:00:03.000Z",
        completedAt: "2026-09-19T00:00:06.000Z",
      },
    });
  });

  it("projects a completed tool once and keeps progress before its result", () => {
    const call = {
      toolCallId: "tool-1",
      name: "create_file",
      input: { path: "hello.txt" },
    };
    const events = [
      event(1, { type: "run.started" }),
      event(2, { type: "tool.called", toolCall: call }),
      event(3, { type: "tool.progress", toolCallId: call.toolCallId, content: [{ type: "text", text: "Writing" }] }),
      event(4, { type: "tool.progress", toolCallId: call.toolCallId, content: [{ type: "text", text: " done" }] }),
      event(5, { type: "tool.completed", result: { ...call, output: { path: "hello.txt" } } }),
    ];
    const message = selectRenderMessages({ runs: [stateFor(events)], events })[0];

    expect(message).toMatchObject({
      id: "tool-run-1-tool-1",
      role: "tool",
      state: "complete",
      tool: {
        toolCallId: "tool-1",
        status: "complete",
        progress: [
          { type: "text", text: "Writing" },
          { type: "text", text: " done" },
        ],
        output: { path: "hello.txt" },
      },
    });
    expect(selectRenderMessages({ runs: [stateFor(events)], events })).toHaveLength(1);
  });

  it("marks tool.completed with isError and tool.failed as failed states", () => {
    const errorResultCall = { toolCallId: "tool-error-result", name: "read_file", input: {} };
    const failedCall = { toolCallId: "tool-failed", name: "write_file", input: {} };
    const events = [
      event(1, { type: "run.started" }),
      event(2, { type: "tool.called", toolCall: errorResultCall }),
      event(3, { type: "tool.completed", result: { ...errorResultCall, output: "permission denied", isError: true } }),
      event(4, { type: "tool.called", toolCall: failedCall }),
      event(5, { type: "tool.failed", error: { ...failedCall, error: "timed out", code: "TIMEOUT" } }),
    ];
    const messages = selectRenderMessages({ runs: [stateFor(events)], events });

    expect(messages.map((message) => message.tool?.status)).toEqual(["failed", "failed"]);
    expect(messages[0]?.tool).toMatchObject({ error: "permission denied", output: "permission denied" });
    expect(messages[1]?.tool).toMatchObject({ error: "timed out", errorCode: "TIMEOUT" });
  });

  it("keeps multiple ordered tool calls at one location each without duplicate output", () => {
    const calls = [
      { toolCallId: "tool-1", name: "first", input: {} },
      { toolCallId: "tool-2", name: "second", input: {} },
      { toolCallId: "tool-3", name: "third", input: {} },
    ];
    const events = [
      event(1, { type: "run.started" }),
      ...calls.flatMap((call, index) => [
        event(2 + index * 2, { type: "tool.called", toolCall: call }),
        event(3 + index * 2, { type: "tool.completed", result: { ...call, output: { index } } }),
      ]),
    ];
    const messages = selectRenderMessages({ runs: [stateFor(events)], events });

    expect(messages.map((message) => message.id)).toEqual([
      "tool-run-1-tool-1",
      "tool-run-1-tool-2",
      "tool-run-1-tool-3",
    ]);
    expect(messages.map((message) => message.tool?.output)).toEqual([
      { index: 0 },
      { index: 1 },
      { index: 2 },
    ]);
    expect(new Set(messages.map((message) => message.id)).size).toBe(3);
  });

  it("projects tool approval and resolution without changing the tool ID", () => {
    const call = { toolCallId: "tool-approval", name: "delete_file", input: { path: "x" } };
    const required = {
      kind: "tool-approval" as const,
      interruptId: "interrupt-1",
      prompt: "Allow deletion?",
      actions: [
        { id: "yes", name: "Approve", input: { approved: true } },
        { id: "no", name: "Deny", input: { approved: false } },
      ],
    };
    const pendingEvents = [
      event(1, { type: "run.started" }),
      event(2, { type: "tool.called", toolCall: call }),
      event(3, { type: "interrupt.required", interrupt: required }),
    ];
    const pending = selectRenderMessages({ runs: [stateFor(pendingEvents)], events: pendingEvents })[0];
    expect(pending).toMatchObject({
      id: "tool-run-1-tool-approval",
      tool: { status: "approval" },
      approval: {
        interruptId: "interrupt-1",
        kind: "tool-approval",
        state: "pending",
        actions: [
          { id: "yes", kind: "approve" },
          { id: "no", kind: "deny" },
        ],
      },
    });

    const resolvedEvents = [
      ...pendingEvents,
      event(4, { type: "interrupt.resolved", interruptId: "interrupt-1", decisions: [{ approved: true }] }),
    ];
    const resolved = selectRenderMessages({ runs: [stateFor(resolvedEvents)], events: resolvedEvents })[0];
    expect(resolved?.id).toBe(pending?.id);
    expect(resolved?.approval).toMatchObject({ state: "resolved", decisions: [{ approved: true }] });
  });

  it("renders a stable custom interrupt fallback", () => {
    const events = [
      event(1, { type: "run.started" }),
      event(2, {
        type: "interrupt.required",
        interrupt: {
          kind: "custom",
          interruptId: "custom-1",
          prompt: "Choose a deployment target.",
          actions: [{ id: "staging", name: "Use staging", input: "staging" }],
          payload: { options: ["staging", "production"] },
        },
      }),
    ];
    const messages = selectRenderMessages({ runs: [stateFor(events)], events });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: "interrupt-run-1-custom-1",
      role: "assistant",
      state: "streaming",
      approval: {
        kind: "custom",
        state: "pending",
        detail: "Choose a deployment target.",
        payload: { options: ["staging", "production"] },
      },
    });
  });

  it("keeps partial content visible for completion, failure, and cancellation", () => {
    const completedEvents = [
      ...startedMessageEvents([{ type: "text", text: "done" }]),
      event(4, { type: "run.completed", finishReason: "stop", content: [] }),
    ];
    const failedEvents = [
      ...startedMessageEvents([{ type: "text", text: "partial" }]),
      event(4, { type: "run.failed", code: "MODEL_ERROR", message: "Model failed." }),
    ];
    const cancelledEvents = [
      ...startedMessageEvents([{ type: "text", text: "cancelled partial" }]),
      event(4, { type: "run.cancelled", reason: "user requested stop" }),
    ];

    expect(selectRenderModel({ runs: [stateFor(completedEvents)], events: completedEvents }).turns[0]).toMatchObject({ state: "completed" });
    expect(selectRenderMessages({ runs: [stateFor(failedEvents)], events: failedEvents })[0]).toMatchObject({
      state: "error",
      content: [{ type: "text", text: "partial" }],
      error: { scope: "run", code: "MODEL_ERROR", detail: "Model failed." },
    });
    expect(selectRenderMessages({ runs: [stateFor(cancelledEvents)], events: cancelledEvents })[0]).toMatchObject({
      state: "stopped",
      content: [{ type: "text", text: "cancelled partial" }],
    });
  });

  it("keeps transport errors separate from run failures", () => {
    const completedEvents = [
      ...startedMessageEvents([{ type: "text", text: "history" }]),
      event(4, { type: "run.completed", finishReason: "stop", content: [] }),
    ];
    const model = selectRenderModel({
      runs: [stateFor(completedEvents)],
      events: completedEvents,
      streamStatus: "error",
      streamError: new Error("Connection dropped."),
    });

    expect(model.transportError).toMatchObject({ scope: "transport", detail: "Connection dropped." });
    expect(model.turns[0]?.error).toBeUndefined();
    expect(model.turns[0]?.state).toBe("completed");
  });

  it("deduplicates replayed event IDs and preserves chronological turns", () => {
    const firstRun = [
      event(1, { type: "run.started" }, { eventId: "first-start", runId: "run-1" }),
      event(2, { type: "message.started", messageId: "first-message", role: "assistant" }, { eventId: "first-message-start", runId: "run-1" }),
      event(3, { type: "message.part.delta", messageId: "first-message", part: { type: "text", text: "one" } }, { eventId: "first-delta", runId: "run-1" }),
      event(4, { type: "run.completed", finishReason: "stop", content: [] }, { eventId: "first-complete", runId: "run-1" }),
    ];
    const secondRun = [
      event(1, { type: "run.started" }, { eventId: "second-start", runId: "run-2" }),
      event(2, { type: "message.started", messageId: "second-message", role: "assistant" }, { eventId: "second-message-start", runId: "run-2" }),
      event(3, { type: "message.part.delta", messageId: "second-message", part: { type: "text", text: "two" } }, { eventId: "second-delta", runId: "run-2" }),
      event(4, { type: "run.completed", finishReason: "stop", content: [] }, { eventId: "second-complete", runId: "run-2" }),
    ];
    const replayed = [...firstRun, firstRun[2]!, ...secondRun];
    const model = selectRenderModel({
      runs: [stateFor(firstRun), stateFor(secondRun)],
      events: replayed,
    });

    expect(model.turns.map((turn) => turn.runId)).toEqual(["run-1", "run-2"]);
    expect(model.messages.map((message) => message.id)).toEqual(["first-message", "second-message"]);
    expect(model.messages[0]?.content).toEqual([{ type: "text", text: "one" }]);
  });

  it("preserves every typed content part, including a safe custom fallback", () => {
    const content: ContentPart[] = [
      { type: "image", url: "https://example.test/image.png", mimeType: "image/png" },
      { type: "audio", data: "audio-data", mimeType: "audio/mpeg" },
      { type: "video", fileId: "video-1", mimeType: "video/mp4" },
      { type: "file", url: "https://example.test/file.txt", name: "file.txt", mimeType: "text/plain" },
      { type: "citation", url: "https://example.test/source", title: "Source" },
      { type: "custom", name: "chart", data: { value: 42 } },
    ];
    const events = [
      event(1, { type: "run.started" }),
      event(2, { type: "message.started", messageId: "assistant-typed", role: "assistant" }),
      ...content.map((part, index) => event(3 + index, { type: "message.part.delta", messageId: "assistant-typed", part })),
    ];
    const message = selectRenderMessages({ runs: [stateFor(events)], events })[0];

    expect(message?.content).toEqual(content);
    expect(message?.content.map((part) => part.type)).toEqual([
      "image",
      "audio",
      "video",
      "file",
      "citation",
      "custom",
    ]);
  });

  it("projects usage and final run content onto the turn", () => {
    const finalContent: ContentPart[] = [{ type: "text", text: "Final answer" }];
    const events = [
      event(1, { type: "run.started" }),
      event(2, { type: "usage.updated", usage: { inputTokens: 4, outputTokens: 8, totalTokens: 12 } }),
      event(3, { type: "run.completed", finishReason: "stop", content: finalContent, usage: { totalTokens: 12 } }),
    ];
    const model = selectRenderModel({ runs: [stateFor(events)], events });

    expect(model.turns[0]).toMatchObject({
      state: "completed",
      finishReason: "stop",
      usage: { totalTokens: 12 },
      messages: [{ id: "run-content-run-1", content: finalContent, state: "complete" }],
    });
  });
});
