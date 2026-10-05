import { describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "@agentdock-ai/contracts";
import { AgentStore } from "../src/core/agent-store.js";
import { consumeAgentStream } from "../src/core/consume-agent-stream.js";
import { sequence, complete } from "../../../scripts/fixtures/events.js";

const quiet = (cleanup = vi.fn()) => ({
  [Symbol.asyncIterator]: () => ({
    next: () => new Promise<IteratorResult<AgentEvent>>(() => {}),
    return: cleanup,
  }),
});
async function* source(events: AgentEvent[]) {
  yield* events;
}

describe("stream ownership and cleanup", () => {
  it("wakes and releases an old quiet consumer when a new consumer takes ownership", async () => {
    const store = new AgentStore();
    const cleanup = vi.fn(() => Promise.reject(new Error("cleanup")));
    const first = consumeAgentStream(store, quiet(cleanup));
    const second = consumeAgentStream(
      store,
      source(sequence([{ type: "run.started" }, complete("Done")])),
    );
    await Promise.all([first, second]);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      streamStatus: "closed",
      agent: { status: "completed" },
    });
  });
  it("does not stop an active consumer when a different request arrives already aborted", async () => {
    const store = new AgentStore();
    const activeAbort = new AbortController();
    const active = consumeAgentStream(store, quiet(), {
      signal: activeAbort.signal,
    });
    const preAbort = new AbortController();
    preAbort.abort();
    const cleanup = vi.fn();
    await consumeAgentStream(store, quiet(cleanup), {
      signal: preAbort.signal,
    });
    expect(store.getSnapshot().streamStatus).toBe("consuming");
    expect(cleanup).toHaveBeenCalledTimes(1);
    activeAbort.abort();
    await active;
    expect(store.getSnapshot().streamStatus).toBe("stopped");
  });
  it.each(["sync", "reject", "never"])(
    "aborts promptly despite %s iterator cleanup",
    async (mode) => {
      const cleanup = vi.fn(() => {
        if (mode === "sync") throw new Error("cleanup failed");
        if (mode === "reject")
          return Promise.reject(new Error("cleanup failed"));
        return new Promise<IteratorResult<AgentEvent>>(() => {});
      });
      const store = new AgentStore();
      const abort = new AbortController();
      const pending = consumeAgentStream(store, quiet(cleanup), {
        signal: abort.signal,
      });
      abort.abort();
      await pending;
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot().streamStatus).toBe("stopped");
    },
  );
  it("preserves iterator creation errors and releases ownership for the next stream", async () => {
    const store = new AgentStore();
    await expect(
      consumeAgentStream(store, {
        [Symbol.asyncIterator]() {
          throw new Error("create failed");
        },
      }),
    ).rejects.toThrow("create failed");
    expect(store.getSnapshot().streamStatus).toBe("error");
    await consumeAgentStream(
      store,
      source(sequence([{ type: "run.started" }, complete("Done")])),
    );
    expect(store.getSnapshot().streamStatus).toBe("closed");
  });
  it("rejects a stream that ends without a terminal event or pause", async () => {
    const store = new AgentStore();
    await expect(
      consumeAgentStream(store, source(sequence([{ type: "run.started" }]))),
    ).rejects.toThrow("before a terminal event");
    expect(store.getSnapshot().agent.status).toBe("running");
    expect(store.getSnapshot().renderModel.turns[0]!.transportState).toBe(
      "error",
    );
  });
});

it("ignores synchronous cleanup failure for an already aborted request", async () => {
  const abort = new AbortController();
  abort.abort();
  const store = new AgentStore();
  await consumeAgentStream(
    store,
    {
      [Symbol.asyncIterator]() {
        throw new Error("cleanup");
      },
    },
    { signal: abort.signal },
  );
  expect(store.getSnapshot().streamStatus).toBe("stopped");
});
it("ignores a read rejection after cancellation", async () => {
  const store = new AgentStore();
  const abort = new AbortController();
  const source = {
    [Symbol.asyncIterator]: () => ({
      next: () =>
        new Promise<IteratorResult<AgentEvent>>((_, reject) => {
          abort.abort();
          reject(new Error("late read"));
        }),
    }),
  };
  await consumeAgentStream(store, source, { signal: abort.signal });
  expect(store.getSnapshot().streamStatus).toBe("stopped");
});

it("closes a paused stream without a terminal event", async () => {
  const store = new AgentStore();
  await consumeAgentStream(
    store,
    source(
      sequence([
        { type: "run.started" },
        { type: "run.paused", next: ["step"] },
      ]),
    ),
  );
  expect(store.getSnapshot()).toMatchObject({
    streamStatus: "closed",
    agent: { status: "waiting" },
  });
});
it("rejects an empty stream without inventing lifecycle events", async () => {
  const store = new AgentStore();
  await expect(consumeAgentStream(store, source([]))).rejects.toThrow(
    "before a terminal event",
  );
  expect(store.getSnapshot().events).toEqual([]);
});
