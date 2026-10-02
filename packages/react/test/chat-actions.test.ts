import { describe, expect, it } from "vitest";
import { AgentStore } from "@agentdock-ai/ui-core";
import { createChatActions } from "../src/react/chat-actions.js";
import {
  scenarios,
  sequence,
  complete,
} from "../../../scripts/fixtures/events.js";
import type { AgentEvent } from "@agentdock-ai/ui-core";
import type { ChatAttachment } from "../src/react/chat-adapter.js";

async function* stream(events: readonly AgentEvent[]) {
  yield* events;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
it.each(["run.paused", "run.failed", "run.cancelled"] as const)(
  "continues %s through the app without adding a user message",
  async (type) => {
    const store = new AgentStore();
    const pause =
      type === "run.paused"
        ? { type, next: ["node"] }
        : type === "run.failed"
          ? { type, code: "retry", message: "Retry", recoverable: true }
          : { type, recoverable: true };
    sequence([{ type: "run.started" }, pause], "paused-run").forEach((event) =>
      store.applyEvent(event),
    );
    store.setStreamStatus("closed");
    let received: unknown;
    const actions = createChatActions(
      store,
      {
        sendMessage: () => stream([]),
        continueRun(input) {
          received = input;
          return stream(
            sequence(
              [{ type: "run.started" }, complete("Continued")],
              "continued-run",
            ),
          );
        },
      },
      () => {},
    );
    expect(await actions.sendMessage("Wrong path")).toBe(false);
    expect(await actions.continueRun()).toBe(true);
    expect(received).toMatchObject({
      runId: "paused-run",
      signal: expect.any(AbortSignal),
    });
    expect(store.getSnapshot().agent.status).toBe("completed");
    expect(
      store.getSnapshot().messages.some((message) => message.role === "user"),
    ).toBe(false);
  },
);
it("does not invent continuation capabilities or bypass a pending interrupt", async () => {
  const store = new AgentStore();
  scenarios.approval.forEach((event) => store.applyEvent(event));
  const actions = createChatActions(
    store,
    { sendMessage: () => stream([]) },
    () => {},
  );
  expect(await actions.continueRun()).toBe(false);
  let called = false;
  const supported = createChatActions(
    store,
    {
      sendMessage: () => stream([]),
      continueRun() {
        called = true;
        return stream([]);
      },
    },
    () => {},
  );
  expect(await supported.continueRun()).toBe(false);
  expect(called).toBe(false);
});
it("keeps a failed continuation retryable and blocks overlapping attempts", async () => {
  const store = new AgentStore();
  sequence([
    { type: "run.started" },
    { type: "run.paused", next: ["node"] },
  ]).forEach((event) => store.applyEvent(event));
  let latest:
    import("../src/react/chat-actions.js").ChatActionState | undefined;
  const actions = createChatActions(
    store,
    {
      sendMessage: () => stream([]),
      continueRun() {
        throw new Error("secret API key");
      },
    },
    (state) => {
      latest = state;
    },
  );
  expect(await actions.continueRun()).toBe(false);
  expect(latest?.actionError).toMatchObject({ scope: "continue" });
  expect(latest?.actionError?.message).not.toContain("secret");
  expect(store.getSnapshot().agent.status).toBe("waiting");
  const pending = createChatActions(
    store,
    {
      sendMessage: () => stream([]),
      continueRun: () => ({
        [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
      }),
    },
    () => {},
  );
  const attempt = pending.continueRun();
  expect(await pending.continueRun()).toBe(false);
  pending.dispose();
  await expect(attempt).resolves.toBe(true);
});
describe("ChatAdapter actions", () => {
  it.each(["success", "failure"])(
    "targets any pending interrupt and keeps its response scoped on %s",
    async (mode) => {
      const store = new AgentStore();
      sequence([
        { type: "run.started" },
        {
          type: "interrupt.required",
          interrupt: {
            interruptId: "first",
            kind: "custom",
            prompt: "First",
            actions: [],
          },
        },
        {
          type: "interrupt.required",
          interrupt: {
            interruptId: "second",
            kind: "custom",
            prompt: "Second",
            actions: [],
          },
        },
      ]).forEach((event) => store.applyEvent(event));
      const received: unknown[] = [];
      let state:
        import("../src/react/chat-actions.js").ChatActionState | undefined;
      const actions = createChatActions(
        store,
        {
          sendMessage: () => stream([]),
          respondToInterrupt(input) {
            received.push(input.decisions);
            if (mode === "failure") throw new Error("secret");
            return stream(
              sequence(
                [
                  {
                    type: "interrupt.resolved",
                    interruptId: input.interruptId,
                    decisions: [...input.decisions],
                  },
                ],
                input.runId,
                "phase-2",
                store.getSnapshot().agent.lastLogicalSequence,
              ),
            );
          },
        },
        (value) => {
          state = value;
        },
      );
      expect(await actions.respondToInterrupt("second", [{ opaque: 42 }])).toBe(
        mode === "success",
      );
      expect(received).toEqual([[{ opaque: 42 }]]);
      expect(store.getSnapshot().agent.interrupts[0]?.interruptId).toBe(
        "first",
      );
      if (mode === "success") {
        expect(await actions.respondToInterrupt("second", [{}])).toBe(false);
        expect(received).toHaveLength(1);
      } else {
        expect(state?.actionError?.scope).toBe("approval");
        expect(state?.actionError?.message).toContain(
          "decision is still pending",
        );
        expect(state?.actionError?.message).not.toContain("secret");
      }
    },
  );
  it("rejects approval responses after local cancellation", async () => {
    const store = new AgentStore();
    scenarios.approval.forEach((event) => store.applyEvent(event));
    store.setStreamStatus("stopped");
    let called = false;
    const actions = createChatActions(
      store,
      {
        sendMessage: () => stream([]),
        respondToInterrupt() {
          called = true;
          return stream([]);
        },
      },
      () => {},
    );
    expect(await actions.respondToInterrupt("decision-1", [{}])).toBe(false);
    expect(called).toBe(false);
  });
  it("sends uploaded attachments and records canonical content without synthetic events", async () => {
    const store = new AgentStore();
    const attachment: ChatAttachment = {
      id: "file-1",
      name: "notes.txt",
      size: 12,
      content: { type: "file", fileId: "file-1", name: "notes.txt" },
    };
    let received: unknown;
    const actions = createChatActions(
      store,
      {
        attachments: { upload: async () => attachment },
        sendMessage: (input) => {
          received = input.attachments;
          return stream(scenarios.conversation);
        },
      },
      () => {},
    );
    expect(await actions.sendMessage("", [attachment])).toBe(true);
    expect(received).toEqual([attachment]);
    expect(store.getSnapshot().messages[0]?.content).toEqual([
      attachment.content,
    ]);
    expect(store.getSnapshot().events).toEqual(scenarios.conversation);
  });
  it("rejects attachments when the app has no upload capability", async () => {
    const store = new AgentStore();
    const actions = createChatActions(
      store,
      { sendMessage: () => stream([]) },
      () => {},
    );
    expect(
      await actions.sendMessage("", [
        {
          id: "f",
          name: "f.txt",
          size: 0,
          content: { type: "file", fileId: "f" },
        },
      ]),
    ).toBe(false);
    expect(store.getSnapshot().messages).toHaveLength(0);
  });
  it("sends through the app and rejects overlapping submissions", async () => {
    const store = new AgentStore();
    const calls: string[] = [];
    const actions = createChatActions(
      store,
      {
        sendMessage: ({ text }) => {
          calls.push(text);
          return stream(scenarios.conversation);
        },
      },
      () => {},
    );
    const first = actions.sendMessage(" Hello ");
    expect(await actions.sendMessage("Second")).toBe(false);
    expect(await first).toBe(true);
    expect(calls).toEqual(["Hello"]);
    expect(store.getSnapshot().agent.status).toBe("completed");
  });
  it("records synchronous adapter failure without leaking exception text", async () => {
    const store = new AgentStore();
    const actions = createChatActions(
      store,
      {
        sendMessage() {
          throw new Error("Authorization: secret");
        },
      },
      () => {},
    );
    expect(await actions.sendMessage("Keep this draft")).toBe(false);
    expect(
      store.getSnapshot().renderModel.transportError?.detail,
    ).not.toContain("secret");
    expect(store.getSnapshot().messages[0]?.content).toEqual([
      { type: "text", text: "Keep this draft" },
    ]);
  });
  it("passes opaque approval inputs and continues the same turn", async () => {
    const store = new AgentStore();
    let received: unknown;
    scenarios.approval.forEach((event) => store.applyEvent(event));
    const actions = createChatActions(
      store,
      {
        sendMessage: () => stream([]),
        respondToInterrupt: (input) => {
          received = input.decisions;
          return stream(
            sequence(
              [
                {
                  type: "interrupt.resolved",
                  interruptId: input.interruptId,
                  decisions: [...input.decisions],
                },
                complete("Done"),
              ],
              input.runId,
              "phase-2",
              scenarios.approval.length,
            ),
          );
        },
      },
      () => {},
    );
    expect(await actions.respondToInterrupt("stale", [{}])).toBe(false);
    expect(
      await actions.respondToInterrupt("decision-1", [{ opaque: 42 }]),
    ).toBe(true);
    expect(received).toEqual([{ opaque: 42 }]);
    expect(store.getSnapshot().runs).toHaveLength(1);
    expect(store.getSnapshot().agent.interrupt).toBeNull();
  });
  it("has no fake stop capability and aborts local consumption promptly on unmount", async () => {
    const store = new AgentStore();
    let signal: AbortSignal | undefined;
    const actions = createChatActions(
      store,
      {
        sendMessage(input) {
          signal = input.signal;
          return {
            [Symbol.asyncIterator]() {
              return { next: () => new Promise(() => {}) };
            },
          };
        },
      },
      () => {},
    );
    const pending = actions.sendMessage("Hello");
    expect(await actions.cancelRun()).toBe(false);
    actions.dispose();
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(store.getSnapshot().streamStatus).toBe("stopped");
    expect(store.getSnapshot().agent.status).toBe("idle");
  });
  it("calls real cancellation, retains partial output and accepts a later run", async () => {
    const store = new AgentStore();
    let cancelled = "";
    let first = true;
    const actions = createChatActions(
      store,
      {
        async *sendMessage() {
          if (first) {
            first = false;
            yield* scenarios.streaming;
            await new Promise(() => {});
          } else
            yield* sequence(
              [{ type: "run.started" }, complete("Next")],
              "next",
            );
        },
        async cancelRun({ runId }) {
          cancelled = runId;
        },
      },
      () => {},
    );
    const pending = actions.sendMessage("Start");
    await tick();
    expect(await actions.cancelRun()).toBe(true);
    await pending;
    expect(cancelled).toBe("fixture-run");
    expect(store.getSnapshot().agent.status).toBe("running");
    expect(store.getSnapshot().renderModel.turns[0]?.items[1]).toMatchObject({
      state: "stopped",
    });
    expect(await actions.sendMessage("Continue")).toBe(true);
    expect(store.getSnapshot().runs).toHaveLength(2);
  });
});

it("keeps a failed cancellation scoped and the active stream usable", async () => {
  const store = new AgentStore();
  let current:
    import("../src/react/chat-actions.js").ChatActionState | undefined;
  const actions = createChatActions(
    store,
    {
      async *sendMessage() {
        yield* scenarios.streaming;
        await new Promise(() => {});
      },
      async cancelRun() {
        throw new Error("Provider secret");
      },
    },
    (state) => {
      current = state;
    },
  );
  const pending = actions.sendMessage("Start");
  await tick();
  expect(await actions.cancelRun()).toBe(false);
  expect(current?.actionError?.scope).toBe("cancel");
  expect(store.getSnapshot().streamStatus).toBe("consuming");
  actions.dispose();
  await pending;
});
