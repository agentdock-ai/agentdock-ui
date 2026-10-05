import {
  AGENT_EVENT_PROTOCOL_VERSION,
  assertAgentEventInput,
  cloneContentParts,
  cloneJsonValue,
  createAgentReducerState,
  type AgentReducerMessage,
  type AgentReducerState,
} from "@agentdock-ai/contracts";
import type {
  RenderMessageItem,
  RenderToolCallItem,
  RenderTurn,
} from "./render-model.js";

/** Durable display status; it never changes native execution state. */
export interface AgentHistoryMessage extends AgentReducerMessage {
  state?: "complete" | "stopped" | "error";
}

/** App-normalized checkpoint history. This is display data, never an event stream. */
export interface AgentHistory {
  messages: readonly AgentHistoryMessage[];
  /** A fresh native pending-state projection, with no invocation or event IDs. */
  resumeState?: AgentReducerState | null;
}

export function cloneHistoryMessages(
  messages: readonly AgentHistoryMessage[],
): AgentHistoryMessage[] {
  if (!Array.isArray(messages))
    throw new Error("History messages must be an array.");
  const ids = new Set<string>();
  return messages.map((message) => {
    if (
      !message ||
      typeof message.messageId !== "string" ||
      !message.messageId.trim()
    )
      throw new Error("History messages require a stable messageId.");
    if (ids.has(message.messageId))
      throw new Error("History message IDs must be unique.");
    ids.add(message.messageId);
    if (!["user", "assistant", "tool"].includes(message.role))
      throw new Error("History message role must be user, assistant, or tool.");
    if (
      message.state !== undefined &&
      !["complete", "stopped", "error"].includes(message.state)
    )
      throw new Error(
        "History message state must be complete, stopped, or error.",
      );
    return {
      ...(message.state !== undefined ? { state: message.state } : {}),
      messageId: message.messageId,
      role: message.role,
      content: cloneContentParts(message.content, "History message content"),
    };
  });
}

export function cloneResumeState(state: AgentReducerState): AgentReducerState {
  if (
    state.runId !== null ||
    state.status !== "waiting" ||
    state.protocolVersion !== AGENT_EVENT_PROTOCOL_VERSION ||
    typeof state.threadId !== "string" ||
    !state.threadId.trim() ||
    !Array.isArray(state.messages) ||
    state.messages.length ||
    !Array.isArray(state.eventIds) ||
    state.eventIds.length ||
    !Array.isArray(state.interrupts) ||
    !Array.isArray(state.pausedNodes) ||
    !state.pausedNodes.every((node) => typeof node === "string") ||
    (!state.interrupts.length && !state.pausedNodes.length)
  )
    throw new Error(
      "History resumeState must be a fresh native waiting-state projection.",
    );
  const interrupts = state.interrupts.map((interrupt) => {
    assertAgentEventInput({ type: "interrupt.required", interrupt });
    return structuredClone(interrupt);
  });
  if (
    new Set(interrupts.map((interrupt) => interrupt.interruptId)).size !==
    interrupts.length
  )
    throw new Error("History interrupt IDs must be unique.");
  return {
    ...createAgentReducerState(),
    protocolVersion: state.protocolVersion,
    threadId: state.threadId,
    status: "waiting",
    interrupts,
    interrupt: interrupts[0] ?? null,
    pausedNodes: [...state.pausedNodes],
  };
}

/** Render checkpoint messages in their original order, without assigning run identities. */
export function projectHistory(
  messages: readonly AgentHistoryMessage[],
): RenderTurn[] {
  const turns: RenderTurn[] = [];
  const tools = new Map<string, RenderToolCallItem>();
  for (const message of messages) {
    if (!turns.length || message.role === "user") {
      turns.push({
        id: `history-${message.messageId}`,
        runId: null,
        sessionId: null,
        state: "completed",
        items: [],
        transportState: "closed",
        usage: null,
        limit: null,
        finishReason: null,
        cancellationReason: null,
      });
    }
    const turn = turns.at(-1)!;
    if (message.state === "stopped") turn.state = "stopped";
    else if (message.state === "error") turn.state = "failed";
    const items = [...turn.items];
    let segment: RenderMessageItem | undefined;
    let segments = 0;
    for (const part of message.content) {
      if (part.type === "tool-call" || part.type === "tool-result") {
        segment = undefined;
        const record = part.type === "tool-call" ? part.toolCall : part.result;
        let item = tools.get(record.toolCallId);
        if (!item) {
          item = {
            id: `tool-${record.toolCallId}`,
            runId: null,
            phaseId: null,
            position: items.length,
            type: "tool-call",
            active: false,
            tool: {
              toolCallId: record.toolCallId,
              name: record.name,
              input: record.input,
              progress: [],
              status: "running",
            },
          };
          tools.set(record.toolCallId, item);
          items.push(item);
        }
        if (part.type === "tool-result") {
          item.tool = {
            ...item.tool,
            output: cloneJsonValue(part.result.output),
            status: part.result.isError ? "failed" : "complete",
          };
        }
        continue;
      }
      if (!segment) {
        segment = {
          id: `${message.messageId}:${segments++}`,
          runId: null,
          phaseId: null,
          position: items.length,
          type: "message",
          messageId: message.messageId,
          role: message.role,
          state: message.state ?? "complete",
          blocks: [],
        };
        items.push(segment);
      }
      segment.blocks = [
        ...segment.blocks,
        {
          ...part,
          id: `${segment.id}:block-${segment.blocks.length}`,
          position: segment.blocks.length,
          state: message.state ?? "complete",
        },
      ];
    }
    turn.items = items;
  }
  return turns;
}
