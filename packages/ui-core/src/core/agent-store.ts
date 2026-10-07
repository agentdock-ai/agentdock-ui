import {
  cloneAgentEvent,
  AGENT_EVENT_PROTOCOL_VERSION,
  createAgentReducerState,
  reduceAgentEvent,
  type AgentEvent,
  type AgentReducerState,
  type ContentPart,
  type ConversationHistory,
  type ConversationActions,
} from "@agentdock-ai/contracts";
import { selectRenderModel } from "../select-render-model.js";
import type { RenderModel } from "../render-model.js";
import {
  cloneHistoryMessages,
  cloneResumeState,
  type AgentHistory,
  type AgentHistoryMessage,
} from "../history.js";

export type AgentStreamStatus =
  "idle" | "consuming" | "closed" | "error" | "stopped";

export interface AgentStoreSnapshot {
  /** Saved transcript supplied by the application, independent of execution events. */
  history: readonly AgentHistoryMessage[];
  /** The first live turn continues the last hydrated turn after a native pause. */
  historyContinuation: boolean;
  conversationActions: ConversationActions | null;
  /** State for the latest run, reduced by the canonical AgentDock contract. */
  agent: AgentReducerState;
  /** Per-run snapshots, retained so a multi-turn chat keeps its history. */
  runs: readonly AgentReducerState[];
  /** Raw events retained for diagnostics and replay-style debugging. */
  events: readonly AgentEvent[];
  /** Validated events per conversation turn, including resumed invocations. */
  turnEvents: readonly (readonly AgentEvent[])[];
  /** Transport lifecycle, separate from the agent run lifecycle. */
  streamStatus: AgentStreamStatus;
  /** Transport outcomes per turn, retained independently of canonical lifecycle. */
  turnStreamStatuses: readonly AgentStreamStatus[];
  streamError: unknown | null;
  /** Normalized state for framework consumers; raw events remain diagnostic only. */
  renderModel: RenderModel;
}

export type AgentStoreListener = () => void;

function createInitialSnapshot(): AgentStoreSnapshot {
  const snapshot: Omit<AgentStoreSnapshot, "renderModel"> = {
    history: [],
    historyContinuation: false,
    conversationActions: null,
    agent: createAgentReducerState(),
    runs: [],
    events: [],
    turnEvents: [],
    streamStatus: "idle",
    turnStreamStatuses: [],
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
 * The store projects saved history and reduces live events for rendering. It does not run models,
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

  /** Replace saved history atomically before consuming a stream. No events are invented. */
  hydrateHistory({ messages, resumeState }: AgentHistory): void {
    if (
      this.snapshot.streamStatus === "consuming" ||
      this.snapshot.agent.status === "running"
    )
      throw new Error("Cannot hydrate history while a run is active.");
    const history = cloneHistoryMessages(messages);
    const agent = resumeState
      ? cloneResumeState(resumeState)
      : createAgentReducerState();
    this.update({
      ...createInitialSnapshot(),
      history,
      agent,
      historyContinuation: Boolean(resumeState),
      runs: resumeState ? [agent] : [],
      turnEvents: resumeState ? [[]] : [],
    });
  }

  /** Hydrate the durable conversation contract without inventing execution events. */
  hydrateConversationHistory(history: ConversationHistory): void {
    const messages = history.messages.map((message) => ({
      messageId: message.id,
      role: message.role,
      content: message.content,
      ...(message.outcome === "complete"
        ? {}
        : {
            state:
              message.outcome === "streaming"
                ? ("stopped" as const)
                : message.outcome,
          }),
    }));
    const hasNativePending =
      history.nativeControls.pendingNodes.length > 0 ||
      history.nativeControls.interrupts.length > 0;
    const resumeState: AgentReducerState | null = hasNativePending
      ? {
          ...createAgentReducerState(),
          protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
          threadId: history.thread.id,
          status: "waiting",
          interrupts: structuredClone(history.nativeControls.interrupts),
          interrupt: structuredClone(
            history.nativeControls.interrupts[0] ?? null,
          ),
          pausedNodes: [...history.nativeControls.pendingNodes],
        }
      : null;
    this.hydrateHistory({ messages, resumeState });
    this.update({
      ...this.snapshot,
      conversationActions: { ...history.actions },
    });
  }

  applyEvent(rawEvent: AgentEvent): void {
    const event = cloneAgentEvent(rawEvent);
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

    const runs = this.replaceLatestRun(nextAgent, startsNewRun);
    this.update({
      ...this.snapshot,
      agent: nextAgent,
      runs,
      // The consuming app owns persistence; this log is diagnostic only.
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

    const runs = this.replaceLatestRun(nextAgent, startsNewRun);
    this.update({
      ...this.snapshot,
      agent: nextAgent,
      runs,
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
    const turnStreamStatuses = snapshot.runs.map((_, index) =>
      index === snapshot.runs.length - 1
        ? snapshot.streamStatus
        : (snapshot.turnStreamStatuses[index] ?? "closed"),
    );
    const next = { ...snapshot, turnStreamStatuses };
    this.snapshot = { ...next, renderModel: selectRenderModel(next) };
    for (const listener of this.listeners) listener();
  }
}
