import { describe, expect, it, vi } from "vitest";
import {
  AGENT_EVENT_PROTOCOL_VERSION,
  createAgentReducerState,
  type AgentReducerMessage,
} from "@agentdock-ai/contracts";
import { AgentStore } from "../src/core/agent-store.js";
import { sequence } from "../../../scripts/fixtures/events.js";

const message = (
  messageId: string,
  role: AgentReducerMessage["role"],
  text: string,
): AgentReducerMessage => ({
  messageId,
  role,
  content: [{ type: "text", text }],
});
const history = () => [
  message("u1", "user", "First"),
  message("a1", "assistant", "Answer"),
  message("u2", "user", "Second"),
  message("a2", "assistant", "Another answer"),
];
const seed = () => ({
  ...createAgentReducerState(),
  protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
  threadId: "thread",
  status: "waiting" as const,
  pausedNodes: ["node"],
});
const roles = (store: AgentStore) =>
  store
    .getSnapshot()
    .renderModel.turns.flatMap((turn) => turn.items)
    .filter((item) => item.type === "message")
    .map((item) => item.role);

describe("checkpoint history hydration", () => {
  it("atomically loads ordered messages without creating runs, events, or invocation IDs", () => {
    const store = new AgentStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.hydrateHistory({ messages: history() });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(roles(store)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(store.getSnapshot()).toMatchObject({
      runs: [],
      events: [],
      turnEvents: [],
      agent: { status: "idle", runId: null },
    });
    expect(
      store.getSnapshot().renderModel.turns.map((turn) => turn.runId),
    ).toEqual([null, null]);
    const stable = store.getSnapshot().renderModel.turns.map((turn) => turn.id);
    store.hydrateHistory({ messages: history() });
    expect(
      store.getSnapshot().renderModel.turns.map((turn) => turn.id),
    ).toEqual(stable);
  });
  it("owns saved image content and preserves an attachment-only user message", () => {
    const messages: AgentReducerMessage[] = [
      {
        messageId: "image",
        role: "user",
        content: [{ type: "image", url: "/attachments/image" }],
      },
    ];
    const store = new AgentStore();
    store.hydrateHistory({ messages });
    messages[0]!.content = [];
    expect(store.getSnapshot().renderModel.turns[0]!.items).toMatchObject([
      {
        messageId: "image",
        blocks: [{ type: "image", url: "/attachments/image" }],
      },
    ]);
  });
  it("rejects invalid IDs, duplicate IDs, roles and content without replacing the old snapshot", () => {
    const store = new AgentStore();
    store.hydrateHistory({ messages: history() });
    const previous = store.getSnapshot();
    for (const messages of [
      [message("", "user", "Invalid")],
      [message("same", "user", "One"), message("same", "assistant", "Two")],
      [{ ...message("id", "user", "Invalid"), role: "system" }],
      [
        {
          ...message("id", "user", "Invalid"),
          content: [{ type: "text", text: 42 }],
        },
      ],
    ])
      expect(() =>
        store.hydrateHistory({ messages: messages as AgentReducerMessage[] }),
      ).toThrow();
    expect(store.getSnapshot()).toBe(previous);
  });
  it("appends a live conversation after restored history and resets both together", () => {
    const store = new AgentStore();
    store.hydrateHistory({ messages: history() });
    store.appendUserMessage("New prompt");
    sequence([
      { type: "run.started" },
      {
        type: "message.completed",
        messageId: "a3",
        role: "assistant",
        content: [{ type: "text", text: "New answer" }],
      },
      {
        type: "run.completed",
        finishReason: "stop",
        content: [{ type: "text", text: "New answer" }],
      },
    ]).forEach((event) => store.applyEvent(event));
    expect(roles(store)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(store.getSnapshot().renderModel.turns).toHaveLength(3);
    store.reset();
    expect(store.getSnapshot().history).toEqual([]);
    expect(store.getSnapshot().renderModel.turns).toEqual([]);
  });
  it("reconciles a live message by native ID without duplication or moving later saved messages", () => {
    const store = new AgentStore();
    store.hydrateHistory({
      messages: [
        message("u1", "user", "Prompt"),
        message("a1", "assistant", "Old"),
        message("a2", "assistant", "Later"),
      ],
    });
    sequence([
      { type: "run.started" },
      {
        type: "message.completed",
        messageId: "a1",
        role: "assistant",
        content: [{ type: "text", text: "Updated" }],
      },
    ]).forEach((event) => store.applyEvent(event));
    expect(store.getSnapshot().renderModel.turns[0]!.items).toMatchObject([
      { messageId: "u1" },
      { messageId: "a1", blocks: [{ text: "Updated" }] },
      { messageId: "a2" },
    ]);
  });
  it("renders tool calls and their results once in checkpoint order", () => {
    const call = {
      toolCallId: "tool",
      name: "read_file",
      input: { path: "test.txt" },
    };
    const store = new AgentStore();
    store.hydrateHistory({
      messages: [
        message("user", "user", "Read"),
        {
          messageId: "call",
          role: "assistant",
          content: [
            { type: "text", text: "Reading" },
            { type: "tool-call", toolCall: call },
          ],
        },
        {
          messageId: "result",
          role: "tool",
          content: [
            { type: "tool-result", result: { ...call, output: "Contents" } },
          ],
        },
        message("answer", "assistant", "Done"),
      ],
    });
    expect(store.getSnapshot().renderModel.turns[0]!.items).toMatchObject([
      { role: "user" },
      { role: "assistant" },
      {
        type: "tool-call",
        active: false,
        tool: { status: "complete", output: "Contents" },
      },
      { role: "assistant" },
    ]);
  });
  it("restores a native pause without a fabricated runId and continues the same saved turn", () => {
    const store = new AgentStore();
    store.hydrateHistory({ messages: history(), resumeState: seed() });
    expect(store.getSnapshot().agent).toMatchObject({
      status: "waiting",
      runId: null,
      pausedNodes: ["node"],
    });
    sequence(
      [
        { type: "run.started" },
        {
          type: "message.completed",
          messageId: "continued",
          role: "assistant",
          content: [{ type: "text", text: "Continued" }],
        },
        {
          type: "run.completed",
          finishReason: "stop",
          content: [{ type: "text", text: "Continued" }],
        },
      ],
      "resumed",
    ).forEach((event) => store.applyEvent(event));
    expect(store.getSnapshot().renderModel.turns).toHaveLength(2);
    expect(
      store.getSnapshot().renderModel.turns[1]!.items.at(-1),
    ).toMatchObject({ messageId: "continued" });
    store.appendUserMessage("Next");
    expect(store.getSnapshot().renderModel.turns).toHaveLength(3);
  });
  it("preserves native pending approvals without manufacturing interrupt events", () => {
    const store = new AgentStore();
    const interrupt = {
      interruptId: "pending",
      kind: "custom" as const,
      prompt: "Choose",
      actions: [{ id: "yes", name: "Yes", input: true }],
    };
    const resumeState = {
      ...seed(),
      pausedNodes: [],
      interrupt,
      interrupts: [interrupt],
    };
    store.hydrateHistory({ messages: history(), resumeState });
    interrupt.prompt = "Changed by producer";
    expect(store.getSnapshot().events).toEqual([]);
    expect(store.getSnapshot().renderModel.turns.at(-1)).toMatchObject({
      state: "waiting",
      items: [
        { role: "user" },
        { role: "assistant" },
        { type: "approval", approval: { detail: "Choose", state: "pending" } },
      ],
    });
  });
  it("refuses to overwrite an active stream or hydrate a historical invocation as native control state", () => {
    const store = new AgentStore();
    expect(() =>
      store.hydrateHistory({
        messages: [],
        resumeState: { ...seed(), runId: "old-run" },
      }),
    ).toThrow("fresh native");
    store.setStreamStatus("consuming");
    expect(() => store.hydrateHistory({ messages: [] })).toThrow("active");
  });
});

it("restores interrupted replies with stopped blocks and keeps the next turn separate", () => {
  const store = new AgentStore();
  store.hydrateHistory({
    messages: [
      message("sun", "user", "Explain the Sun"),
      { ...message("partial", "assistant", "The Sun moves"), state: "stopped" },
      message("name", "user", "What is my name?"),
    ],
  });
  const turns = store.getSnapshot().renderModel.turns;
  expect(turns).toHaveLength(2);
  expect(turns[0]).toMatchObject({
    state: "stopped",
    items: [
      { messageId: "sun" },
      {
        messageId: "partial",
        state: "stopped",
        blocks: [{ text: "The Sun moves", state: "stopped" }],
      },
    ],
  });
  expect(turns[1]).toMatchObject({
    state: "completed",
    items: [{ messageId: "name" }],
  });
  expect(store.getSnapshot().agent.status).toBe("idle");
});

it("preserves failed replies and rejects invalid persisted message states atomically", () => {
  const store = new AgentStore();
  store.hydrateHistory({
    messages: [
      message("u", "user", "Prompt"),
      { ...message("a", "assistant", "Partial"), state: "error" },
      { ...message("b", "assistant", "Saved"), state: "complete" },
    ],
  });
  expect(store.getSnapshot().renderModel.turns[0]).toMatchObject({
    state: "failed",
    items: [
      { messageId: "u" },
      { state: "error", blocks: [{ state: "error" }] },
      { state: "complete" },
    ],
  });
  const previous = store.getSnapshot();
  expect(() =>
    store.hydrateHistory({
      messages: [
        {
          ...message("bad", "assistant", "Bad"),
          state: "streaming" as "complete",
        },
      ],
    }),
  ).toThrow("History message state");
  expect(store.getSnapshot()).toBe(previous);
});

it("restores a pending tool approval against its saved native call and reconciles resumed execution once", () => {
  const call = {
    toolCallId: "native-call",
    name: "run_command",
    input: { path: "check.mjs" },
  };
  const interrupt = {
    interruptId: "approval",
    kind: "tool-approval" as const,
    prompt: "Run this check?",
    actions: [
      {
        id: "run",
        name: "run_command",
        input: call.input,
        toolCallId: call.toolCallId,
      },
    ],
  };
  const store = new AgentStore();
  store.hydrateHistory({
    messages: [
      message("user", "user", "Run the check"),
      {
        messageId: "call-message",
        role: "assistant",
        content: [{ type: "tool-call", toolCall: call }],
      },
      message("saved", "assistant", "Waiting for permission"),
    ],
    resumeState: { ...seed(), interrupt, interrupts: [interrupt] },
  });
  expect(store.getSnapshot().renderModel.turns[0]).toMatchObject({
    state: "waiting",
    items: [
      { messageId: "user" },
      {
        type: "tool-call",
        active: false,
        tool: { toolCallId: "native-call", status: "approval" },
      },
      { messageId: "saved" },
      { type: "approval", approval: { title: "Your approval is needed" } },
    ],
  });
  sequence(
    [
      { type: "run.started" },
      {
        type: "interrupt.resolved",
        interruptId: "approval",
        decisions: [{ type: "approve" }],
      },
      { type: "tool.called", toolCall: call },
      { type: "tool.completed", result: { ...call, output: "OK" } },
      { type: "run.completed", finishReason: "stop", content: [] },
    ],
    "resumed-tool",
  ).forEach((event) => store.applyEvent(event));
  const turns = store.getSnapshot().renderModel.turns;
  expect(turns).toHaveLength(1);
  const tools = turns[0]!.items.filter((item) => item.type === "tool-call");
  expect(tools).toHaveLength(1);
  expect(tools[0]).toMatchObject({
    tool: { status: "complete", output: "OK" },
  });
  expect(turns[0]!.items.at(-1)).toMatchObject({ messageId: "saved" });
});
