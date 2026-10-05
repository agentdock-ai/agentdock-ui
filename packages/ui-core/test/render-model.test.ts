import { describe, expect, it } from "vitest";
import {
  createAgentReducerState,
  reduceAgentEvents,
  type AgentEventInput,
  type ContentPart,
} from "@agentdock-ai/contracts";
import { AgentStore } from "../src/core/agent-store.js";
import { selectRenderModel } from "../src/select-render-model.js";
import {
  call,
  intro,
  scenarios,
  sequence,
  text,
  complete,
} from "../../../scripts/fixtures/events.js";

function model(
  inputs: readonly AgentEventInput[],
  streamStatus:
    "idle" | "consuming" | "closed" | "stopped" | "error" = "consuming",
) {
  const events = sequence([...inputs]);
  return selectRenderModel({
    runs: [reduceAgentEvents(events)],
    turnEvents: [events],
    streamStatus,
  });
}
function items(inputs: readonly AgentEventInput[]) {
  return model(inputs).turns[0]!.items;
}

const approval: AgentEventInput = {
  type: "interrupt.required",
  interrupt: {
    kind: "tool-approval",
    interruptId: "approve",
    prompt: "Allow deletion?",
    actions: [
      { id: "allow", toolCallId: call.toolCallId, name: "Allow", input: true },
    ],
  },
};

describe("ordered render model", () => {
  it("keeps streamed text and completion at a stable location", () => {
    const inputs = [...intro, text("Hel"), text("lo")];
    const streaming = items(inputs);
    const completed = items([
      ...inputs,
      {
        type: "message.completed",
        messageId: "answer",
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
      },
      complete("Hello"),
    ]);
    expect(streaming).toMatchObject([
      {
        type: "message",
        state: "streaming",
        blocks: [{ type: "text", text: "Hello" }],
      },
    ]);
    expect(completed).toMatchObject([
      { id: streaming[0]!.id, state: "complete", blocks: [{ text: "Hello" }] },
    ]);
  });
  it("keeps reasoning with its original timing when the final answer omits it", () => {
    const result = items([
      ...intro,
      {
        type: "message.part.delta",
        messageId: "answer",
        part: { type: "reasoning", text: "Think" },
      },
      text("Answer"),
      {
        type: "message.completed",
        messageId: "answer",
        role: "assistant",
        content: [{ type: "text", text: "Answer" }],
      },
    ]);
    expect(result).toMatchObject([
      {
        blocks: [
          {
            type: "reasoning",
            text: "Think",
            state: "complete",
            startedAt: expect.any(String),
            completedAt: expect.any(String),
          },
          { type: "text", text: "Answer" },
        ],
      },
    ]);
  });
  it("preserves progress, output and tool timing without duplicate items", () => {
    expect(
      items([
        { type: "run.started" },
        { type: "tool.called", toolCall: call },
        {
          type: "tool.progress",
          toolCallId: call.toolCallId,
          content: [{ type: "text", text: "Writing" }],
        },
        { type: "tool.completed", result: { ...call, output: { ok: true } } },
      ]),
    ).toMatchObject([
      {
        type: "tool-call",
        active: false,
        tool: {
          status: "complete",
          progress: [{ text: "Writing" }],
          output: { ok: true },
          startedAt: expect.any(String),
          completedAt: expect.any(String),
        },
      },
    ]);
  });
  it.each(["result", "failed"] as const)(
    "retains error details from a tool %s",
    (kind) => {
      const end: AgentEventInput =
        kind === "result"
          ? {
              type: "tool.completed",
              result: { ...call, isError: true, output: "permission denied" },
            }
          : {
              type: "tool.failed",
              error: { ...call, error: "timed out", code: "TIMEOUT" },
            };
      const result = items([
        { type: "run.started" },
        { type: "tool.called", toolCall: call },
        end,
      ]);
      expect(result).toMatchObject([
        {
          type: "tool-call",
          tool: {
            status: "failed",
            error: kind === "result" ? "permission denied" : "timed out",
          },
        },
      ]);
    },
  );
  it("keeps a single approval card associated with its tool through resolution", () => {
    const inputs: AgentEventInput[] = [
      { type: "run.started" },
      { type: "tool.called", toolCall: call },
      approval,
    ];
    const pending = items(inputs);
    const resolved = items([
      ...inputs,
      { type: "interrupt.resolved", interruptId: "approve", decisions: [true] },
      { type: "tool.completed", result: { ...call, output: "done" } },
    ]);
    expect(pending).toMatchObject([
      { type: "tool-call", tool: { status: "approval" } },
      { type: "approval", approval: { state: "pending" } },
    ]);
    expect(resolved).toMatchObject([
      { id: pending[0]!.id, tool: { status: "complete" } },
      {
        id: pending[1]!.id,
        approval: { state: "resolved", decisions: [true] },
      },
    ]);
  });
  it("keeps custom approvals and opaque inputs unchanged", () => {
    const input = { target: ["staging", "production"] };
    expect(
      items([
        { type: "run.started" },
        {
          type: "interrupt.required",
          interrupt: {
            kind: "custom",
            interruptId: "custom",
            prompt: "Choose",
            actions: [{ id: "select", name: "Choose", input }],
            payload: input,
          },
        },
      ]),
    ).toMatchObject([
      {
        type: "approval",
        approval: {
          kind: "custom",
          detail: "Choose",
          actions: [{ input }],
          payload: input,
        },
      },
    ]);
  });
  it.each(["completed", "failed", "cancelled"] as const)(
    "preserves partial content on run.%s",
    (kind) => {
      const end: AgentEventInput =
        kind === "completed"
          ? { type: "run.completed", finishReason: "stop", content: [] }
          : kind === "failed"
            ? {
                type: "run.failed",
                code: "MODEL_ERROR",
                message: "Model failed",
              }
            : { type: "run.cancelled", reason: "User stopped" };
      const turn = model([...intro, text("Partial"), end]).turns[0]!;
      expect(turn.state).toBe(kind === "cancelled" ? "stopped" : kind);
      expect(turn.items[0]).toMatchObject({
        blocks: [{ text: "Partial" }],
        state:
          kind === "completed"
            ? "complete"
            : kind === "cancelled"
              ? "stopped"
              : "error",
      });
      if (kind === "failed")
        expect(turn.error).toMatchObject({
          code: "MODEL_ERROR",
          detail: "Model failed",
          scope: "run",
        });
      if (kind === "cancelled")
        expect(turn.cancellationReason).toBe("User stopped");
    },
  );
  it.each(["closed", "error", "stopped"] as const)(
    "stops activity on transport %s without changing canonical lifecycle",
    (status) => {
      const turn = model(
        [...intro, text("Partial"), { type: "tool.called", toolCall: call }],
        status,
      ).turns[0]!;
      expect(turn.state).toBe("running");
      expect(turn.items).toMatchObject([
        { state: "stopped" },
        { active: false },
      ]);
    },
  );
  it("keeps transport errors separate from completed run state", () => {
    const result = model(
      [...intro, text("History"), complete("History")],
      "error",
    );
    expect(result.transportError).toMatchObject({
      scope: "transport",
      retryable: false,
    });
    expect(result.turns[0]).toMatchObject({ state: "completed" });
    expect(result.turns[0]!.error).toBeUndefined();
  });
  it("preserves every typed content block", () => {
    const content: ContentPart[] = [
      {
        type: "image",
        url: "https://example.test/image.png",
        mimeType: "image/png",
      },
      { type: "audio", data: "audio", mimeType: "audio/mpeg" },
      { type: "video", fileId: "video", mimeType: "video/mp4" },
      {
        type: "file",
        url: "https://example.test/file.txt",
        name: "file.txt",
        mimeType: "text/plain",
      },
      { type: "citation", url: "https://example.test/source", title: "Source" },
      { type: "custom", name: "chart", data: { value: 42 } },
    ];
    const result = items([
      ...intro,
      ...content.map((part): AgentEventInput => ({
        type: "message.part.delta",
        messageId: "answer",
        part,
      })),
    ]);
    expect(result).toMatchObject([{ blocks: content }]);
  });
  it("projects final-only content and usage onto the turn", () => {
    expect(
      model([
        { type: "run.started" },
        {
          type: "usage.updated",
          usage: { inputTokens: 4, outputTokens: 8, totalTokens: 12 },
        },
        complete("Final answer"),
      ]).turns[0],
    ).toMatchObject({
      state: "completed",
      finishReason: "stop",
      usage: { totalTokens: 12 },
      startedAt: expect.any(String),
      completedAt: expect.any(String),
      items: [{ type: "message", blocks: [{ text: "Final answer" }] }],
    });
  });
  it("keeps transcript data when diagnostic events are evicted", () => {
    const store = new AgentStore();
    scenarios.tools.forEach((event) => store.applyEvent(event));
    const snapshot = store.getSnapshot();
    const result = selectRenderModel({
      runs: snapshot.runs,
      turnEvents: snapshot.turnEvents,
      streamStatus: snapshot.streamStatus,
    });
    expect(result).toEqual(snapshot.renderModel);
    expect(result.turns[0]!.items.map((item) => item.type)).toEqual([
      "message",
      "tool-timeline",
      "message",
    ]);
  });
  it("requires an event history for each turn", () => {
    expect(() =>
      selectRenderModel({ runs: [createAgentReducerState()], turnEvents: [] }),
    ).toThrow("Each run must have a corresponding turn event history");
  });
  it("never exposes a second flat transcript on the store or render model", () => {
    const store = new AgentStore();
    store.appendUserMessage("Hello");
    expect(store.getSnapshot()).not.toHaveProperty("messages");
    expect(store.getSnapshot().renderModel).not.toHaveProperty("messages");
    expect(store.getSnapshot().renderModel.turns[0]).not.toHaveProperty(
      "messages",
    );
  });
});

it.each([
  [{ error: "denied" }, "denied"],
  [{ message: "unavailable" }, "unavailable"],
  [{ status: "failed" }, "The tool could not complete."],
  [null, "The tool could not complete."],
] as const)("preserves a structured tool error %j", (output, detail) => {
  expect(
    items([
      { type: "run.started" },
      { type: "tool.called", toolCall: call },
      { type: "tool.completed", result: { ...call, isError: true, output } },
    ]),
  ).toMatchObject([{ tool: { status: "failed", error: detail } }]);
});
it("places a linked approval after its tool and groups remaining consecutive calls", () => {
  const calls = [
    call,
    { ...call, toolCallId: "second" },
    { ...call, toolCallId: "third" },
    { ...call, toolCallId: "fourth" },
  ];
  const turn = model(
    [
      { type: "run.started" },
      ...calls.map((toolCall): AgentEventInput => ({
        type: "tool.called",
        toolCall,
      })),
      approval,
    ],
    "closed",
  ).turns[0]!;
  expect(turn.items.map((item) => item.type)).toEqual([
    "tool-call",
    "approval",
    "tool-timeline",
  ]);
  expect(turn.items[2]).toMatchObject({
    tools: [{ active: false }, { active: false }, { active: false }],
  });
});
it("reconciles final run text with the last existing assistant rather than adding an answer", () => {
  const result = items([
    ...intro,
    text("Draft"),
    {
      type: "run.completed",
      finishReason: "stop",
      content: [
        { type: "text", text: "Final " },
        { type: "text", text: "answer" },
      ],
    },
  ]);
  expect(result).toMatchObject([
    { messageId: "answer", blocks: [{ text: "Final answer" }] },
  ]);
});
it("reconciles final media snapshots without duplicating or changing their positions", () => {
  const result = items([
    ...intro,
    {
      type: "message.part.delta",
      messageId: "answer",
      part: { type: "image", url: "https://example.test/draft.png" },
    },
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [{ type: "image", url: "https://example.test/final.png" }],
    },
  ]);
  expect(result).toMatchObject([
    {
      blocks: [
        { type: "image", url: "https://example.test/final.png", position: 2 },
      ],
    },
  ]);
});
it("coalesces completed embedded tool failures with observed calls", () => {
  const result = items([
    ...intro,
    { type: "tool.called", toolCall: call },
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [
        { type: "tool-call", toolCall: call },
        {
          type: "tool-result",
          result: { ...call, isError: true, output: "Failed" },
        },
      ],
    },
  ]);
  expect(result).toMatchObject([
    {
      type: "tool-call",
      tool: { status: "failed", error: "Failed", output: "Failed" },
    },
  ]);
});
it("normalizes consecutive final parts and preserves complete reasoning between text segments", () => {
  const result = items([
    ...intro,
    text("Before"),
    {
      type: "message.part.delta",
      messageId: "answer",
      part: { type: "reasoning", text: "Thinking" },
    },
    text("After"),
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [
        { type: "text", text: "Before" },
        { type: "text", text: "After" },
      ],
    },
  ]);
  expect(result).toMatchObject([
    {
      blocks: [
        { text: "Before" },
        { type: "reasoning", text: "Thinking" },
        { text: "After" },
      ],
    },
  ]);
});

it("renders completed messages when the provider emits no deltas", () => {
  expect(
    items([
      ...intro,
      {
        type: "message.completed",
        messageId: "answer",
        role: "assistant",
        content: [{ type: "text", text: "Final" }],
      },
    ]),
  ).toMatchObject([{ state: "complete", blocks: [{ text: "Final" }] }]);
});
it("reconciles adjacent completed text parts and replaces omitted media", () => {
  const result = items([
    ...intro,
    text("Before"),
    {
      type: "message.part.delta",
      messageId: "answer",
      part: { type: "image", url: "https://example.test/image.png" },
    },
    text("After"),
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [
        { type: "text", text: "Final " },
        { type: "text", text: "answer" },
      ],
    },
  ]);
  expect(result).toMatchObject([
    { blocks: [{ type: "text", text: "Final answer" }] },
  ]);
});
it("keeps separate turn histories chronological without local transport metadata", () => {
  const first = sequence([...intro, text("First"), complete("First")], "first");
  const second = sequence([...intro, text("Second")], "second");
  const result = selectRenderModel({
    runs: [reduceAgentEvents(first), reduceAgentEvents(second)],
    turnEvents: [first, second],
    streamStatus: "consuming",
  });
  expect(result.turns).toMatchObject([
    {
      runId: "first",
      transportState: "closed",
      items: [{ blocks: [{ text: "First" }] }],
    },
    {
      runId: "second",
      transportState: "consuming",
      items: [{ blocks: [{ text: "Second" }] }],
    },
  ]);
});

it.each(["message", "run"])(
  "adds content first supplied by %s completion to the existing message",
  (kind) => {
    const content: ContentPart[] = [
      { type: "text", text: "Answer" },
      { type: "citation", url: "https://example.test/source", title: "Source" },
    ];
    const end: AgentEventInput =
      kind === "message"
        ? {
            type: "message.completed",
            messageId: "answer",
            role: "assistant",
            content,
          }
        : { type: "run.completed", finishReason: "stop", content };
    expect(items([...intro, text("Draft"), end])).toMatchObject([
      { blocks: content },
    ]);
  },
);
it("reconciles embedded protocol parts after streamed text without duplicating tools", () => {
  const result = items([
    ...intro,
    text("Before"),
    { type: "tool.called", toolCall: call },
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [
        { type: "text", text: "Before" },
        { type: "tool-call", toolCall: call },
        { type: "tool-result", result: { ...call, output: "Done" } },
      ],
    },
  ]);
  expect(result).toMatchObject([
    { type: "message", blocks: [{ text: "Before" }] },
    { type: "tool-call", tool: { output: "Done", status: "complete" } },
  ]);
});

it("rejects a history paired with the wrong reducer messages instead of guessing a role", () => {
  const events = sequence([...intro, text("Answer")]);
  const run = { ...reduceAgentEvents(events), messages: [] };
  expect(() =>
    selectRenderModel({ runs: [run], turnEvents: [events] }),
  ).toThrow("unknown message");
});
