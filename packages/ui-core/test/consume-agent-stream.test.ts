import { AGENT_EVENT_PROTOCOL_VERSION } from "@agentdock-ai/contracts";
import { describe, expect, it } from "vitest";
import { AgentStore } from "../src/core/agent-store.js";
import { consumeAgentStream } from "../src/core/consume-agent-stream.js";
import type { AgentEvent, AgentEventInput } from "@agentdock-ai/contracts";

function runEvent(
  runId: string,
  eventId: string,
  logicalSequence: number,
  type: "run.started" | "run.completed",
): AgentEvent {
  const base = {
    protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
    eventId,
    runId,
      logicalSequence,
    phaseId: "phase-1",
    sequence: logicalSequence,
    timestamp: new Date(logicalSequence * 1000).toISOString(),
  };
  return type === "run.started"
    ? { ...base, type }
    : { ...base, type, finishReason: "stop", content: [] };
}

async function* eventSource(events: AgentEvent[]): AsyncIterable<AgentEvent> {
  for (const event of events) yield event;
}

function inputEvent(
  runId: string,
  eventId: string,
  logicalSequence: number,
  input: AgentEventInput,
): AgentEvent {
  return {
    protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
    eventId,
    runId,
      logicalSequence,
    phaseId: "phase-1",
    sequence: logicalSequence,
    timestamp: new Date(logicalSequence * 1000).toISOString(),
    ...input,
  } as AgentEvent;
}

describe("consumeAgentStream", () => {
  it("keeps the submitted user message when the assistant stream starts", async () => {
    const store = new AgentStore();

    store.appendUserMessage("Create a file");
    expect(store.getSnapshot().messages).toEqual([
      {
        messageId: expect.stringMatching(/^user-/),
        role: "user",
        content: [{ type: "text", text: "Create a file" }],
      },
    ]);

    await consumeAgentStream(
      store,
      eventSource([
        runEvent("run-1", "event-1", 1, "run.started"),
        runEvent("run-1", "event-2", 2, "run.completed"),
      ]),
    );

    expect(store.getSnapshot().messages[0]?.role).toBe("user");
    expect(store.getSnapshot().messages[0]?.content).toEqual([
      { type: "text", text: "Create a file" },
    ]);
  });

  it("reduces supplied events into the shared store and closes the stream", async () => {
    const store = new AgentStore();

    await consumeAgentStream(
      store,
      eventSource([
        runEvent("run-1", "event-1", 1, "run.started"),
        runEvent("run-1", "event-2", 2, "run.completed"),
      ]),
    );

    expect(store.getSnapshot().agent.status).toBe("completed");
    expect(store.getSnapshot().agent.runId).toBe("run-1");
    expect(store.getSnapshot().runs).toHaveLength(1);
    expect(store.getSnapshot().streamStatus).toBe("closed");
    expect(store.getSnapshot().streamError).toBeNull();
    expect(store.getSnapshot().renderModel.turns[0]?.state).toBe("completed");
    expect(store.getSnapshot().renderModel.messages).toEqual([]);
  });

  it("retains prior runs when a later turn begins in the same chat", async () => {
    const store = new AgentStore();

    await consumeAgentStream(
      store,
      eventSource([
        runEvent("run-1", "event-1", 1, "run.started"),
        runEvent("run-1", "event-2", 2, "run.completed"),
      ]),
    );
    await consumeAgentStream(
      store,
      eventSource([
        runEvent("run-2", "event-3", 1, "run.started"),
        runEvent("run-2", "event-4", 2, "run.completed"),
      ]),
    );

    expect(store.getSnapshot().runs).toHaveLength(2);
    expect(store.getSnapshot().runs.map((run) => run.runId)).toEqual([
      "run-1",
      "run-2",
    ]);
    expect(store.getSnapshot().agent.runId).toBe("run-2");
  });

  it("retains every completed run for the page session", () => {
    const store = new AgentStore();

    for (let runNumber = 1; runNumber <= 101; runNumber += 1) {
      const runId = `run-${runNumber}`;
      store.applyEvent(runEvent(runId, `${runId}-start`, 1, "run.started"));
      store.applyEvent(runEvent(runId, `${runId}-complete`, 2, "run.completed"));
    }

    expect(store.getSnapshot().runs).toHaveLength(101);
    expect(store.getSnapshot().renderModel.turns).toHaveLength(101);
    expect(store.getSnapshot().runs[0]?.runId).toBe("run-1");
    expect(store.getSnapshot().runs.at(-1)?.runId).toBe("run-101");
  });

  it("records invalid stream failures and rethrows them", async () => {
    const store = new AgentStore();

    await expect(
      consumeAgentStream(
        store,
        eventSource([runEvent("run-1", "event-2", 2, "run.completed")]),
      ),
    ).rejects.toThrow("Agent event stream must begin with run.started.");
    expect(store.getSnapshot().streamStatus).toBe("error");
    expect(store.getSnapshot().streamError).toBeInstanceOf(Error);
    expect(store.getSnapshot().renderModel.transportError?.scope).toBe("transport");
    expect(store.getSnapshot().agent.status).toBe("idle");
  });

  it("keeps the complete diagnostic event log and terminal render details", () => {
    const store = new AgentStore();
    store.applyEvent(inputEvent("run-1", "run-1-start", 1, { type: "run.started" }));
    store.applyEvent(inputEvent("run-1", "run-1-message", 2, {
      type: "message.started",
      messageId: "assistant-1",
      role: "assistant",
    }));
    store.applyEvent(inputEvent("run-1", "run-1-delta", 3, {
      type: "message.part.delta",
      messageId: "assistant-1",
      part: { type: "text", text: "partial answer" },
    }));
    for (let sequence = 4; sequence <= 503; sequence += 1) {
      store.applyEvent(inputEvent("run-1", `run-1-usage-${sequence}`, sequence, {
        type: "usage.updated",
        usage: { totalTokens: sequence },
      }));
    }
    store.applyEvent(inputEvent("run-1", "run-1-failed", 504, {
      type: "run.failed",
      code: "MODEL_ERROR",
      message: "The first run failed.",
    }));

    for (let sequence = 1; sequence <= 501; sequence += 1) {
      if (sequence === 1) {
        store.applyEvent(inputEvent("run-2", "run-2-start", sequence, { type: "run.started" }));
      } else {
        store.applyEvent(inputEvent("run-2", `run-2-usage-${sequence}`, sequence, {
          type: "usage.updated",
          usage: { totalTokens: sequence },
        }));
      }
    }
    store.applyEvent(inputEvent("run-2", "run-2-complete", 502, {
      type: "run.completed",
      finishReason: "stop",
      content: [],
    }));

    expect(store.getSnapshot().events).toHaveLength(1006);
    expect(store.getSnapshot().events.some((event) => event.runId === "run-1")).toBe(true);
    const firstTurn = store.getSnapshot().renderModel.turns.find((turn) => turn.runId === "run-1");
    expect(firstTurn).toMatchObject({
      state: "failed",
      startedAt: new Date(1000).toISOString(),
      error: { scope: "run", detail: "The first run failed." },
      messages: [
        {
          id: "assistant-1",
          content: [{ type: "text", text: "partial answer" }],
        },
      ],
    });
  });
});
