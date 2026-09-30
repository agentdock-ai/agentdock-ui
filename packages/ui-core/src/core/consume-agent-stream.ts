import type { AgentEvent } from "@agentdock-ai/contracts";
import { AgentStore } from "./agent-store.js";

export interface ConsumeAgentStreamOptions {
  signal?: AbortSignal;
}

const owners = new WeakMap<AgentStore, object>();

/** Consume canonical events only. Abort stops local consumption without inventing a run event. */
export async function consumeAgentStream(
  store: AgentStore,
  events: AsyncIterable<AgentEvent>,
  { signal }: ConsumeAgentStreamOptions = {},
): Promise<void> {
  if (signal?.aborted) {
    store.setStreamStatus("stopped");
    return;
  }
  const owner = {};
  owners.set(store, owner);
  const setStatus: AgentStore["setStreamStatus"] = (status, error) => {
    if (owners.get(store) === owner) store.setStreamStatus(status, error);
  };
  setStatus("consuming");
  const stopped = Symbol("stopped");
  let interrupt!: (value: typeof stopped) => void;
  const aborted = new Promise<typeof stopped>((resolve) => {
    interrupt = resolve;
  });
  const abort = () => interrupt(stopped);
  signal?.addEventListener("abort", abort, { once: true });
  let iterator: AsyncIterator<AgentEvent> | undefined;
  try {
    iterator = events[Symbol.asyncIterator]();
    while (!signal?.aborted) {
      const next = await Promise.race([iterator.next(), aborted]);
      if (next === stopped || signal?.aborted || owners.get(store) !== owner)
        break;
      if (next.done) {
        const status = store.getSnapshot().agent.status;
        if (status === "running" || status === "idle")
          throw new Error("Stream ended before a terminal event or interrupt.");
        break;
      }
      store.applyEvent(next.value);
      if (
        ["completed", "failed", "cancelled"].includes(
          store.getSnapshot().agent.status,
        )
      )
        break;
    }
    setStatus(signal?.aborted ? "stopped" : "closed");
  } catch (error) {
    if (signal?.aborted) {
      setStatus("stopped");
      return;
    }
    setStatus("error", error);
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    // An uncooperative iterator must not hold the UI hostage during cancellation.
    try {
      void Promise.resolve(iterator?.return?.()).catch(() => undefined);
    } catch {
      /* cleanup only */
    }
  }
}
