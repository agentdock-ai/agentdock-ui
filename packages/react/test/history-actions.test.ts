import { expect, it } from "vitest";
import {
  AGENT_EVENT_PROTOCOL_VERSION,
  createAgentReducerState,
} from "@agentdock-ai/contracts";
import { AgentStore } from "@agentdock-ai/ui-core";
import { createChatActions } from "../src/react/chat-actions.js";
import { sequence, complete } from "../../../scripts/fixtures/events.js";

it.each(["approval", "pause"] as const)(
  "continues a hydrated native %s without inventing an invocation ID",
  async (kind) => {
    const store = new AgentStore();
    const interrupt = {
      interruptId: "native",
      kind: "custom" as const,
      prompt: "Choose",
      actions: [],
    };
    store.hydrateHistory({
      messages: [
        {
          messageId: "user",
          role: "user",
          content: [{ type: "text", text: "Saved prompt" }],
        },
      ],
      resumeState: {
        ...createAgentReducerState(),
        protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
        threadId: "thread",
        status: "waiting",
        pausedNodes: kind === "pause" ? ["node"] : [],
        interrupts: kind === "approval" ? [interrupt] : [],
        interrupt: kind === "approval" ? interrupt : null,
      },
    });
    let received: unknown;
    async function* resumed(input: unknown) {
      received = input;
      yield* sequence(
        [
          { type: "run.started" },
          ...(kind === "approval"
            ? [
                {
                  type: "interrupt.resolved" as const,
                  interruptId: "native",
                  decisions: [true],
                },
              ]
            : []),
          complete("Resumed"),
        ],
        "actual-invocation",
      );
    }
    const actions = createChatActions(
      store,
      {
        async *sendMessage() {},
        respondToInterrupt: resumed,
        continueRun: resumed,
      },
      () => {},
    );
    expect(await actions.sendMessage("Must remain paused")).toBe(false);
    expect(
      await (kind === "approval"
        ? actions.respondToInterrupt("native", [true])
        : actions.continueRun()),
    ).toBe(true);
    expect(received).toMatchObject({ runId: null });
    expect(store.getSnapshot().agent).toMatchObject({
      status: "completed",
      runId: "actual-invocation",
    });
    expect(store.getSnapshot().renderModel.turns).toHaveLength(1);
    expect(store.getSnapshot().renderModel.turns[0]!.items[0]).toMatchObject({
      messageId: "user",
    });
  },
);

it("allows a fresh prompt after reloading a stopped conversation with native pending work", async () => {
  const store = new AgentStore();
  store.hydrateConversationHistory({
    protocolVersion: 1,
    thread: {
      id: "thread",
      title: "Stopped",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    messages: [],
    nextCursor: null,
    snapshotId: "snapshot",
    execution: {
      operationId: "stopped",
      runId: null,
      status: "settled",
      action: "start",
    },
    nativeControls: { pendingNodes: ["model"], interrupts: [] },
    interrupts: [],
    actions: {
      canStart: true,
      canContinue: true,
      canStop: false,
      canRespondToInterrupt: false,
    },
  });
  let prompt: string | undefined;
  const actions = createChatActions(
    store,
    {
      async *sendMessage(input) {
        prompt = input.text;
        yield* sequence(
          [{ type: "run.started" }, complete("Latest answer")],
          "fresh",
        );
      },
    },
    () => {},
  );
  expect(await actions.sendMessage("What is my name?")).toBe(true);
  expect(prompt).toBe("What is my name?");
});
