import { describe, expect, it } from "vitest";
import {
  createAgentReducerState,
  type AgentEvent,
  type AgentEventInput,
  type AgentReducerState,
} from "@agentdock-ai/contracts";
import { selectRenderMessages } from "../src/components/message/select-render-messages.js";

function event(
  runId: string,
  logicalSequence: number,
  input: AgentEventInput,
): AgentEvent {
  return {
    protocolVersion: 1,
    eventId: `event-${logicalSequence}`,
    runId,
    sessionId: "session-1",
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
});
