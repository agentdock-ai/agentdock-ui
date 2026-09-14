import {
  createAgentReducerState,
  reduceAgentEvent,
  type AgentEvent,
  type AgentReducerMessage,
  type AgentReducerState,
} from "@agentdock-ai/contracts";

export type AgentStreamStatus = "idle" | "consuming" | "closed" | "error";

export interface AgentStoreSnapshot {
  /** State for the latest run, reduced by the canonical AgentDock contract. */
  agent: AgentReducerState;
  /** Per-run snapshots, retained so a multi-turn chat keeps its history. */
  runs: readonly AgentReducerState[];
  /** Messages aggregated in run order for chat rendering. */
  messages: readonly AgentReducerMessage[];
  /** Transport lifecycle, kept separate from agent run lifecycle. */
  streamStatus: AgentStreamStatus;
  streamError: unknown | null;
}

export type AgentStoreListener = () => void;

/** Shared external store for one chat session. */
export class AgentStore {
  private snapshot: AgentStoreSnapshot = {
    agent: createAgentReducerState(),
    runs: [],
    messages: [],
    streamStatus: "idle",
    streamError: null,
  };
  private readonly listeners = new Set<AgentStoreListener>();

  getSnapshot = (): AgentStoreSnapshot => this.snapshot;

  subscribe = (listener: AgentStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  applyEvent(event: AgentEvent): void {
    const previous = this.snapshot.agent;
    const startsNextRun =
      (previous.status === "completed" ||
        previous.status === "failed" ||
        previous.status === "cancelled") &&
      event.type === "run.started";
    const base = startsNextRun ? createAgentReducerState() : previous;
    const agent = reduceAgentEvent(base, event);
    if (agent === previous) return;

    const runs =
      startsNextRun || this.snapshot.runs.length === 0
        ? [...this.snapshot.runs, agent]
        : [...this.snapshot.runs.slice(0, -1), agent];
    this.update({
      ...this.snapshot,
      agent,
      runs,
      messages: runs.flatMap((run) => run.messages),
    });
  }

  setStreamStatus(
    streamStatus: AgentStreamStatus,
    streamError: unknown | null = null,
  ): void {
    this.update({ ...this.snapshot, streamStatus, streamError });
  }

  reset(): void {
    this.update({
      agent: createAgentReducerState(),
      runs: [],
      messages: [],
      streamStatus: "idle",
      streamError: null,
    });
  }

  private update(snapshot: AgentStoreSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
