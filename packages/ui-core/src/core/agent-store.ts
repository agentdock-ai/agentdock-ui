import {
  createAgentReducerState,
  reduceAgentEvent,
  type AgentEvent,
  type AgentReducerMessage,
  type AgentReducerState,
} from "@agentdock-ai/contracts";
import { selectRenderModel } from "../select-render-messages.js";
import type { RenderModel } from "../render-model.js";

export type AgentStreamStatus = "idle" | "consuming" | "closed" | "error";

const MAX_RETAINED_RUNS = 100;
const MAX_RETAINED_EVENTS = 500;

export interface AgentStoreSnapshot {
  /** State for the latest run, reduced by the canonical AgentDock contract. */
  agent: AgentReducerState;
  /** Per-run snapshots, retained so a multi-turn chat keeps its history. */
  runs: readonly AgentReducerState[];
  /** Flattened message projection used directly by chat components. */
  messages: readonly AgentReducerMessage[];
  /** Raw events retained for diagnostics and replay-style debugging. */
  events: readonly AgentEvent[];
  /** Transport lifecycle, separate from the agent run lifecycle. */
  streamStatus: AgentStreamStatus;
  streamError: unknown | null;
  /** Normalized state for framework consumers; raw events remain diagnostic only. */
  renderModel: RenderModel;
}

export type AgentStoreListener = () => void;

function createInitialSnapshot(): AgentStoreSnapshot {
  const snapshot: Omit<AgentStoreSnapshot, "renderModel"> = {
    agent: createAgentReducerState(),
    runs: [],
    messages: [],
    events: [],
    streamStatus: "idle",
    streamError: null,
  };
  return { ...snapshot, renderModel: selectRenderModel(snapshot) };
}

function isTerminalRun(status: AgentReducerState["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

/**
 * Frontend state for one AgentDock session.
 *
 * The store only reduces events for rendering. It does not run models,
 * execute tools, make requests, or persist data.
 */
export class AgentStore {
  private snapshot: AgentStoreSnapshot = createInitialSnapshot();
  private readonly listeners = new Set<AgentStoreListener>();

  getSnapshot = (): AgentStoreSnapshot => this.snapshot;

  subscribe = (listener: AgentStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  applyEvent(event: AgentEvent): void {
    const previous = this.snapshot.agent;
    const startsNewRun = isTerminalRun(previous.status) && event.type === "run.started";
    const nextAgent = reduceAgentEvent(
      startsNewRun ? createAgentReducerState() : previous,
      event,
    );

    if (nextAgent === previous) return;

    const runs = this.replaceLatestRun(nextAgent, startsNewRun);
    this.update({
      ...this.snapshot,
      agent: nextAgent,
      runs,
      messages: runs.flatMap((run) => run.messages),
      events: [...this.snapshot.events, event].slice(-MAX_RETAINED_EVENTS),
    });
  }

  setStreamStatus(
    streamStatus: AgentStreamStatus,
    streamError: unknown | null = null,
  ): void {
    if (
      this.snapshot.streamStatus === streamStatus &&
      this.snapshot.streamError === streamError
    ) {
      return;
    }
    this.update({ ...this.snapshot, streamStatus, streamError });
  }

  /** Add the submitted prompt immediately, before the backend stream emits assistant events. */
  appendUserMessage(text: string): void {
    const value = text.trim();
    if (!value) return;

    const current = this.snapshot.agent;
    const startsNewRun =
      this.snapshot.runs.length === 0 || isTerminalRun(current.status);
    const nextAgent = startsNewRun
      ? createAgentReducerState()
      : { ...current, messages: [...current.messages] };
    nextAgent.messages = [
      ...nextAgent.messages,
      {
        messageId: `user-${crypto.randomUUID()}`,
        role: "user",
        content: [{ type: "text", text: value }],
      },
    ];

    const runs = startsNewRun
      ? [...this.snapshot.runs, nextAgent].slice(-MAX_RETAINED_RUNS)
      : this.snapshot.runs.map((run, index) =>
          index === this.snapshot.runs.length - 1 ? nextAgent : run,
        );
    this.update({
      ...this.snapshot,
      agent: nextAgent,
      runs,
      messages: runs.flatMap((run) => run.messages),
    });
  }

  reset(): void {
    this.update(createInitialSnapshot());
  }

  private replaceLatestRun(
    nextAgent: AgentReducerState,
    startsNewRun: boolean,
  ): AgentReducerState[] {
    const currentRuns = this.snapshot.runs;

    if (startsNewRun || currentRuns.length === 0) {
      return [...currentRuns, nextAgent].slice(-MAX_RETAINED_RUNS);
    }

    return currentRuns.map((run, index) =>
      index === currentRuns.length - 1 ? nextAgent : run,
    );
  }

  private update(snapshot: AgentStoreSnapshot): void {
    this.snapshot = {
      ...snapshot,
      renderModel: selectRenderModel(snapshot),
    };
    for (const listener of this.listeners) listener();
  }
}
