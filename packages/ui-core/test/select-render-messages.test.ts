import { AGENT_EVENT_PROTOCOL_VERSION } from "@agentdock-ai/contracts";
import { describe, expect, it } from "vitest";
import {
  createAgentReducerState,
  type AgentEvent,
  type AgentReducerState,
} from "@agentdock-ai/contracts";
import { selectRenderMessages } from "../src/select-render-messages.js";

function event(
  runId: string,
  logicalSequence: number,
  input: Record<string, unknown>,
): AgentEvent {
  return {
    protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
    eventId: `event-${logicalSequence}`,
    runId,
      logicalSequence,
    phaseId: "phase-1",
    sequence: logicalSequence,
    timestamp: new Date(logicalSequence * 1000).toISOString(),
    ...input,
  } as AgentEvent;
}

function runState(): AgentReducerState {
  const state = createAgentReducerState();
  state.runId = "run-1";
  state.status = "running";
  state.messages = [
    {
      messageId: "user-1",
      role: "user",
      content: [{ type: "text", text: "Create a file" }],
    },
    {
      messageId: "assistant-1",
      role: "assistant",
      content: [{ type: "text", text: "I will create it." }],
    },
  ];
  state.toolCalls = [
    {
      toolCallId: "tool-1",
      name: "create_file",
      input: { path: "hello.txt", content: "hello" },
    },
  ];
  return state;
}

describe("selectRenderMessages", () => {
  it("normalizes user, assistant, and running tool messages in event order", () => {
    const run = runState();
    const messages = selectRenderMessages({
      runs: [run],
      events: [
        event("run-1", 1, { type: "message.started", messageId: "assistant-1", role: "assistant" }),
        event("run-1", 2, { type: "tool.called", toolCall: run.toolCalls[0]! }),
      ],
    });

    expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "tool"]);
    expect(messages[1]?.state).toBe("streaming");
    expect(messages[2]?.tool?.status).toBe("running");
  });

  it("links each approval card to the exact tool call in a concurrent batch", () => {
    const run = runState();
    const firstCall = {
      toolCallId: "call-first",
      name: "same_tool",
      input: { value: 1 },
    };
    const secondCall = {
      toolCallId: "call-second",
      name: "same_tool",
      input: { value: 1 },
    };
    run.status = "waiting";
    run.toolCalls = [firstCall, secondCall];
    const batchInterrupt = {
      kind: "tool-approval",
      interruptId: "interrupt-batch",
      prompt: "Approve both calls.",
      actions: [
        {
          id: "call-second",
          toolCallId: "call-second",
          name: "same_tool",
          input: { value: 1 },
        },
        {
          id: "call-first",
          toolCallId: "call-first",
          name: "same_tool",
          input: { value: 1 },
        },
      ],
    } as unknown as NonNullable<AgentReducerState["interrupt"]>;
    run.interrupt = batchInterrupt;
    const messages = selectRenderMessages({
      runs: [run],
      events: [
        event("run-1", 1, { type: "tool.called", toolCall: firstCall }),
        event("run-1", 2, { type: "tool.called", toolCall: secondCall }),
        event("run-1", 3, {
          type: "interrupt.required",
          interrupt: batchInterrupt,
        }),
      ],
    });
    const tools = messages.filter((message) => message.role === "tool");

    expect(tools.map((message) => [
      message.tool?.toolCallId,
      message.tool?.status,
      message.approval?.actions.map((action) => action.toolCallId),
    ])).toEqual([
      ["call-first", "approval", ["call-first"]],
      ["call-second", "approval", ["call-second"]],
    ]);
  });

  it("does not infer a missing approval link from a single active tool", () => {
    const run = runState();
    run.status = "waiting";
    const unlinkedInterrupt = {
      kind: "tool-approval",
      interruptId: "interrupt-unlinked",
      prompt: "Approve.",
      actions: [{ id: "approval-1", name: "create_file", input: {} }],
    } as unknown as NonNullable<AgentReducerState["interrupt"]>;
    run.interrupt = unlinkedInterrupt;
    const messages = selectRenderMessages({
      runs: [run],
      events: [
        event("run-1", 1, {
          type: "tool.called",
          toolCall: run.toolCalls[0]!,
        }),
        event("run-1", 2, {
          type: "interrupt.required",
          interrupt: unlinkedInterrupt,
        }),
      ],
    });
    const tool = messages.find((message) => message.role === "tool");
    const standaloneApproval = messages.find(
      (message) => message.approval?.interruptId === "interrupt-unlinked",
    );

    expect(tool?.tool?.status).toBe("running");
    expect(tool?.approval).toBeUndefined();
    expect(standaloneApproval?.approval?.actions).toHaveLength(1);
  });

  it("marks completed assistant and tool messages as complete", () => {
    const run = runState();
    run.status = "completed";
    run.toolResults = [
      {
        ...run.toolCalls[0]!,
        output: { ok: true },
      },
    ];
    const messages = selectRenderMessages({
      runs: [run],
      events: [
        event("run-1", 1, { type: "message.started", messageId: "assistant-1", role: "assistant" }),
        event("run-1", 2, { type: "message.completed", messageId: "assistant-1", role: "assistant", content: run.messages[1]!.content }),
        event("run-1", 3, { type: "tool.called", toolCall: run.toolCalls[0]! }),
      ],
    });

    expect(messages[1]?.state).toBe("complete");
    expect(messages[2]?.state).toBe("complete");
    expect(messages[2]?.tool?.output).toEqual({ ok: true });
  });

  it("keeps protocol tool parts out of the assistant bubble", () => {
    const run = runState();
    run.status = "completed";
    run.messages[1]!.content = [
      { type: "tool-call", toolCall: run.toolCalls[0]! },
      { type: "text", text: "The file is ready." },
      { type: "tool-result", result: { ...run.toolCalls[0]!, output: { ok: true } } },
    ];
    run.toolResults = [{ ...run.toolCalls[0]!, output: { ok: true } }];

    const messages = selectRenderMessages({ runs: [run], events: [] });
    const assistant = messages.find((message) => message.role === "assistant");

    expect(assistant?.content).toEqual([{ type: "text", text: "The file is ready." }]);
    expect(messages.filter((message) => message.role === "tool")).toHaveLength(1);
  });
});
