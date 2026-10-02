import {
  createAgentReducerState,
  reduceAgentEvent,
  type AgentEvent,
  type AgentReducerMessage,
  type AgentReducerState,
  type ContentPart,
} from "@agentdock-ai/contracts";
import { selectRenderModel } from "../select-render-messages.js";
import type { RenderModel } from "../render-model.js";

export type AgentStreamStatus =
  "idle" | "consuming" | "closed" | "error" | "stopped";

export interface AgentStoreSnapshot {
  /** State for the latest run, reduced by the canonical AgentDock contract. */
  agent: AgentReducerState;
  /** Per-run snapshots, retained so a multi-turn chat keeps its history. */
  runs: readonly AgentReducerState[];
  /** Flattened message projection used directly by chat components. */
  messages: readonly AgentReducerMessage[];
  /** Raw events retained for diagnostics and replay-style debugging. */
  events: readonly AgentEvent[];
  /** Validated events per conversation turn, including resumed invocations. */
  turnEvents: readonly (readonly AgentEvent[])[];
  /** Render snapshots retained independently of the diagnostic event cap. */
  renderHistory: readonly RenderModel["turns"][number][];
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
    turnEvents: [],
    renderHistory: [],
    streamStatus: "idle",
    streamError: null,
  };
  return { ...snapshot, renderModel: selectRenderModel(snapshot) };
}

function isTerminalRun(status: AgentReducerState["status"]): boolean {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
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
    const knownRun = this.snapshot.runs.find(
      (run) => run.runId === event.runId,
    );
    if (knownRun?.eventIds.includes(event.eventId)) {
      reduceAgentEvent(knownRun, event); // Reject conflicting replays using the contract.
      return;
    }
    const startsNewRun =
      isTerminalRun(previous.status) && event.type === "run.started";
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
      // Keep the complete in-page diagnostic event log for now. The store is
      // recreated on refresh, so durable history belongs to AgentDock's
      // session/checkpoint layer rather than this browser-side snapshot.
      events: [...this.snapshot.events, event],
      turnEvents:
        startsNewRun || this.snapshot.turnEvents.length === 0
          ? [...this.snapshot.turnEvents, [event]]
          : this.snapshot.turnEvents.map((events, index) =>
              index === this.snapshot.turnEvents.length - 1
                ? [...events, event]
                : events,
            ),
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
  appendUserMessage(
    text: string,
    attachments: readonly ContentPart[] = [],
  ): void {
    const value = text.trim();
    if (!value && attachments.length === 0) return;

    const current = this.snapshot.agent;
    const startsNewRun =
      this.snapshot.runs.length === 0 ||
      isTerminalRun(current.status) ||
      this.snapshot.streamStatus === "stopped" ||
      this.snapshot.streamStatus === "error";
    const nextAgent = startsNewRun
      ? createAgentReducerState()
      : { ...current, messages: [...current.messages] };
    nextAgent.messages = [
      ...nextAgent.messages,
      {
        messageId: `user-${crypto.randomUUID()}`,
        role: "user",
        content: [
          ...(value ? [{ type: "text" as const, text: value }] : []),
          ...structuredClone([...attachments]),
        ],
      },
    ];

    const runs = startsNewRun
      ? [...this.snapshot.runs, nextAgent]
      : this.snapshot.runs.map((run, index) =>
          index === this.snapshot.runs.length - 1 ? nextAgent : run,
        );
    this.update({
      ...this.snapshot,
      agent: nextAgent,
      runs,
      messages: runs.flatMap((run) => run.messages),
      turnEvents: startsNewRun
        ? [...this.snapshot.turnEvents, []]
        : this.snapshot.turnEvents,
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
      return [...currentRuns, nextAgent];
    }

    return currentRuns.map((run, index) =>
      index === currentRuns.length - 1 ? nextAgent : run,
    );
  }

  private update(snapshot: AgentStoreSnapshot): void {
    const currentModel = selectRenderModel({
      ...snapshot,
      history: snapshot.renderHistory,
    });
    const retainedRunIds = new Set(
      snapshot.runs
        .map((run) => run.runId)
        .filter((runId): runId is string => runId !== null),
    );
    const historyByRunId = new Map(
      snapshot.renderHistory.map((turn) => [turn.runId, turn] as const),
    );
    for (const turn of currentModel.turns) {
      if (turn.runId !== null) {
        historyByRunId.set(turn.runId, turn);
      }
    }
    const renderHistory = [...historyByRunId.values()].filter(
      (turn) => turn.runId !== null && retainedRunIds.has(turn.runId),
    );
    this.snapshot = {
      ...snapshot,
      renderHistory,
      renderModel: selectRenderModel({
        ...snapshot,
        history: renderHistory,
      }),
    };
    for (const listener of this.listeners) listener();
  }
}
