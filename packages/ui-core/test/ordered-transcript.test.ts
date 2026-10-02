import { describe, expect, it } from "vitest";
import { AgentEventType, reduceAgentEvents } from "@agentdock-ai/contracts";
import { AgentStore } from "../src/core/agent-store.js";
import { projectTurnItems } from "../src/project-turn-items.js";
import {
  call,
  intro,
  scenarios,
  sequence,
  text,
  complete,
} from "../../../scripts/fixtures/events.js";

const project = (events: ReturnType<typeof sequence>) =>
  projectTurnItems(reduceAgentEvents(events), events);
it.each([128, 256, 1024])(
  "retains full streamed text and tool placement after %s deltas",
  (count) => {
    const store = new AgentStore();
    const chunks = Array.from({ length: count }, (_, i) => `word-${i} `);
    const events = sequence([
      ...intro,
      text("Before tool."),
      { type: "tool.called", toolCall: call },
      {
        type: "tool.progress",
        toolCallId: call.toolCallId,
        content: [{ type: "text", text: "Reading…" }],
      },
      {
        type: "tool.completed",
        result: { ...call, output: "Read", isError: false },
      },
      ...chunks.map(text),
    ]);
    events.forEach((event) => store.applyEvent(event));
    const items = store.getSnapshot().renderModel.turns[0]!.items;
    expect(store.getSnapshot().agent.eventIds).toHaveLength(128);
    expect(items.map((item) => item.type)).toEqual([
      "message",
      "tool-call",
      "message",
    ]);
    expect(items[0]).toMatchObject({ blocks: [{ text: "Before tool." }] });
    expect(items[1]).toMatchObject({
      tool: { progress: [{ text: "Reading…" }], status: "complete" },
    });
    expect(items[2]).toMatchObject({ blocks: [{ text: chunks.join("") }] });
    store.applyEvent(
      sequence(
        [{ type: "run.cancelled" }],
        "fixture-run",
        "phase-1",
        events.length,
      )[0]!,
    );
    expect(store.getSnapshot().renderModel.turns[0]!.items[2]).toMatchObject({
      state: "stopped",
      blocks: [{ text: chunks.join("") }],
    });
  },
);
it("keeps pending approvals after the reducer replay window rolls over", () => {
  const store = new AgentStore();
  const events = sequence([
    { type: "run.started" },
    {
      type: "interrupt.required",
      interrupt: {
        interruptId: "retained",
        kind: "custom",
        prompt: "Choose",
        actions: [],
      },
    },
    ...Array.from({ length: 150 }, () => ({
      type: "usage.updated" as const,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    })),
  ]);
  events.forEach((event) => store.applyEvent(event));
  expect(store.getSnapshot().renderModel.turns[0]?.items).toMatchObject([
    {
      type: "approval",
      approval: { interruptId: "retained", state: "pending" },
    },
  ]);
});
it("preserves chronological placement when a resume uses a new invocation ID", () => {
  const store = new AgentStore();
  scenarios.approval.forEach((event) => store.applyEvent(event));
  store.setStreamStatus("closed");
  const resume = sequence(
    [
      { type: "run.started" },
      {
        type: "interrupt.resolved",
        interruptId: "decision-1",
        decisions: [true],
      },
      { type: "message.started", messageId: "continued", role: "assistant" },
      {
        type: "message.part.delta",
        messageId: "continued",
        part: { type: "text", text: "Continued" },
      },
      { type: "run.completed", finishReason: "stop", content: [] },
    ],
    "resumed-invocation",
  );
  resume.forEach((event) => store.applyEvent(event));
  expect(store.getSnapshot().runs).toHaveLength(1);
  expect(
    store.getSnapshot().renderModel.turns[0]?.items.map((item) => item.type),
  ).toEqual(["tool-call", "approval", "message"]);
  expect(store.getSnapshot().renderModel.turns[0]?.items[1]).toMatchObject({
    approval: { state: "resolved" },
  });
  store.appendUserMessage("Next turn");
  sequence(
    [{ type: "run.started" }, complete("Next")],
    "next-invocation",
  ).forEach((event) => store.applyEvent(event));
  expect(store.getSnapshot().turnEvents.map((events) => events.length)).toEqual(
    [scenarios.approval.length + resume.length, 2],
  );
  expect(store.getSnapshot().renderModel.turns).toHaveLength(2);
});
describe("V1 ordered transcript", () => {
  it.each(Object.keys(scenarios) as (keyof typeof scenarios)[])(
    "reduces %s with the canonical contract",
    (name) => {
      const store = new AgentStore();
      for (const event of scenarios[name]) store.applyEvent(event);
      expect(store.getSnapshot().events.length).toBe(scenarios[name].length);
    },
  );
  it("covers every current event type including resumption", () => {
    const resume = sequence(
      [
        {
          type: "interrupt.resolved",
          interruptId: "decision-1",
          decisions: [{ decision: "allow" }],
        },
        { type: "run.paused", next: ["step"] },
        complete("Done"),
      ],
      "fixture-run",
      "phase-2",
      scenarios.approval.length,
    );
    project([...scenarios.approval, ...resume]);
    const covered = new Set(
      [...Object.values(scenarios).flat(), ...resume].map((e) => e.type),
    );
    expect([...covered].sort()).toEqual(Object.values(AgentEventType).sort());
  });
  it("preserves text/tool/text order and stable text keys through final reconciliation", () => {
    const events = scenarios.tools;
    const before = project(events.slice(0, -1));
    const after = project(events);
    expect(after.map((i) => i.type)).toEqual([
      "message",
      "tool-timeline",
      "message",
    ]);
    expect(after.map((i) => i.id)).toEqual(before.map((i) => i.id));
    const answer = after
      .flatMap((i) => (i.type === "message" ? i.blocks : []))
      .flatMap((b) => (b.type === "text" ? [b.text] : []));
    expect(answer.join("")).toBe(
      "I’ll check the existing components.The structure looks good. Both files use the host’s theme tokens.",
    );
  });
  it("retains interleaved reasoning and text; groups only within a phase", () => {
    const events = sequence([
      ...intro,
      text("First"),
      {
        type: "message.part.delta",
        messageId: "answer",
        part: { type: "reasoning", text: "Consider" },
      },
      text("Second"),
      { type: "tool.called", toolCall: call },
    ]);
    events.push(
      ...sequence(
        [{ type: "tool.called", toolCall: { ...call, toolCallId: "another" } }],
        "fixture-run",
        "phase-2",
        events.length,
      ),
    );
    const result = project(events);
    expect(result[0]).toMatchObject({
      type: "message",
      blocks: [
        { type: "text", text: "First" },
        { type: "reasoning", text: "Consider" },
        { type: "text", text: "Second" },
      ],
    });
    expect(result.map((i) => i.type)).toEqual([
      "message",
      "tool-call",
      "tool-call",
    ]);
  });
  it("coalesces embedded tools and never guesses action semantics", () => {
    const events = sequence([
      ...intro,
      {
        type: "message.part.delta",
        messageId: "answer",
        part: { type: "tool-call", toolCall: call },
      },
      { type: "tool.called", toolCall: call },
      {
        type: "interrupt.required",
        interrupt: {
          interruptId: "interrupt",
          kind: "tool-approval",
          prompt: "Choose",
          actions: [
            {
              id: "a",
              name: "Yes, reject nothing",
              input: { opaque: 42 },
              toolCallId: call.toolCallId,
            },
          ],
        },
      },
    ]);
    expect(project(events).map((i) => i.type)).toEqual([
      "tool-call",
      "approval",
    ]);
    expect(project(events)[1]).toMatchObject({
      approval: {
        actions: [
          {
            label: "Yes, reject nothing",
            kind: "custom",
            input: { opaque: 42 },
          },
        ],
      },
    });
  });
  it("does not duplicate replayed terminal events or start an old run again", () => {
    const store = new AgentStore();
    scenarios.conversation.forEach((e) => store.applyEvent(e));
    scenarios.conversation.forEach((e) => store.applyEvent(e));
    expect(store.getSnapshot().runs).toHaveLength(1);
    expect(store.getSnapshot().events).toHaveLength(
      scenarios.conversation.length,
    );
  });
  it("keeps isError failures in tool scope and cancellation preserves partial text", () => {
    expect(project(scenarios.toolError)[0]).toMatchObject({
      type: "tool-call",
      active: false,
      tool: { status: "failed" },
    });
    expect(project(scenarios.stopped)[0]).toMatchObject({
      type: "message",
      state: "stopped",
      blocks: [{ state: "stopped" }],
    });
  });
});

it("keeps locally stopped history inactive when a later turn starts", () => {
  const store = new AgentStore();
  scenarios.streaming.forEach((event) => store.applyEvent(event));
  store.setStreamStatus("stopped");
  store.appendUserMessage("Next prompt");
  sequence([{ type: "run.started" }], "second-run").forEach((event) =>
    store.applyEvent(event),
  );
  store.setStreamStatus("consuming");
  expect(store.getSnapshot().renderModel.turns[0]?.transportState).toBe(
    "stopped",
  );
  expect(store.getSnapshot().renderModel.turns[0]?.items[0]).toMatchObject({
    state: "stopped",
    blocks: [{ state: "stopped" }],
  });
});

it("reconciles completed text around reasoning without reordering or duplication", () => {
  const content = [
    { type: "text", text: "First" },
    { type: "reasoning", text: "Consider" },
    { type: "text", text: "Second" },
  ] as const;
  const events = sequence([
    ...intro,
    text("Fir"),
    { type: "message.part.delta", messageId: "answer", part: content[1] },
    text("Sec"),
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [...content],
    },
    { type: "run.completed", finishReason: "stop", content: [...content] },
  ]);
  expect(project(events)[0]).toMatchObject({
    blocks: [
      { type: "text", text: "First" },
      { type: "reasoning", text: "Consider" },
      { type: "text", text: "Second" },
    ],
  });
});

it("retains consecutive media blocks during completion reconciliation", () => {
  const content = [
    { type: "image", fileId: "first", alt: "First" },
    { type: "image", fileId: "second", alt: "Second" },
  ] as const;
  const events = sequence([
    ...intro,
    ...content.map((part) => ({
      type: "message.part.delta" as const,
      messageId: "answer",
      part,
    })),
    {
      type: "message.completed",
      messageId: "answer",
      role: "assistant",
      content: [...content],
    },
  ]);
  expect(project(events)[0]).toMatchObject({ blocks: content });
});
