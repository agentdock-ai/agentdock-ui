import type { AgentEvent } from "@agentdock-ai/contracts";
import { AgentStore } from "./agent-store.js";

export interface ConsumeAgentStreamOptions {
  signal?: AbortSignal;
}

/** Consume typed AgentDock events supplied by the application. This function never makes a request. */
export async function consumeAgentStream(
  store: AgentStore,
  events: AsyncIterable<AgentEvent>,
  options: ConsumeAgentStreamOptions = {},
): Promise<void> {
  const { signal } = options;
  if (signal?.aborted) {
    store.setStreamStatus("closed");
    return;
  }

  store.setStreamStatus("consuming");
  const iterator = events[Symbol.asyncIterator]();
  const abort = () => {
    void iterator.return?.();
  };
  signal?.addEventListener("abort", abort, { once: true });

  try {
    while (!signal?.aborted) {
      const next = await iterator.next();
      if (next.done) break;
      store.applyEvent(next.value);
    }
    store.setStreamStatus("closed");
  } catch (error) {
    store.setStreamStatus("error", error);
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    if (signal?.aborted) {
      await iterator.return?.();
      store.setStreamStatus("closed");
    }
  }
}
