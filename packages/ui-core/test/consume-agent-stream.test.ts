import { describe, expect, it } from "vitest";
import { AgentStore } from "../src/core/agent-store.js";
import { consumeAgentStream } from "../src/core/consume-agent-stream.js";
import type { AgentEvent } from "@agentdock-ai/contracts";

function runEvent(
  runId: string,
  eventId: string,
  logicalSequence: number,
  type: "run.started" | "run.completed",
): AgentEvent {
  const base = {
    protocolVersion: 1 as const,
    eventId,
    runId,
    sessionId: "session-1",
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
});
