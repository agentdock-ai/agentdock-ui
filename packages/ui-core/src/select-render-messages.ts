import { projectTurnItems } from "./project-turn-items.js";
import type {
  AgentEvent,
  AgentReducerMessage,
  AgentReducerState,
  ContentPart,
  JsonValue,
} from "@agentdock-ai/contracts";
import type {
  RenderApproval,
  RenderApprovalAction,
  RenderError,
  RenderMessage,
  RenderMessageSource,
  RenderModel,
  RenderReasoning,
  RenderTool,
  RenderToolStatus,
  RenderTransportError,
  RenderTurn,
} from "./render-model.js";

export type { RenderMessageSource } from "./render-model.js";

interface RunEventIndex {
  messageSequence: Map<string, number>;
  messageStartedAt: Map<string, string>;
  reasoningStartedAt: Map<string, string>;
  messageCompletedAt: Map<string, string>;
  completedMessages: Set<string>;
  toolSequence: Map<string, number>;
  toolStartedAt: Map<string, string>;
  toolCompletedAt: Map<string, string>;
  toolProgress: Map<string, ContentPart[]>;
  interruptRequired: Map<
    string,
    Extract<AgentEvent, { type: "interrupt.required" }>
  >;
  interruptResolved: Map<
    string,
    Extract<AgentEvent, { type: "interrupt.resolved" }>
  >;
  runStartedAt?: string;
  terminalAt?: string;
  runError?: Extract<AgentEvent, { type: "run.failed" }>;
  cancellation?: Extract<AgentEvent, { type: "run.cancelled" }>;
  completionContent?: readonly ContentPart[];
}

interface RenderEntry {
  message: RenderMessage;
  order: number;
  tieBreaker: number;
}

function emptyRunEventIndex(): RunEventIndex {
  return {
    messageSequence: new Map(),
    messageStartedAt: new Map(),
    reasoningStartedAt: new Map(),
    messageCompletedAt: new Map(),
    completedMessages: new Set(),
    toolSequence: new Map(),
    toolStartedAt: new Map(),
    toolCompletedAt: new Map(),
    toolProgress: new Map(),
    interruptRequired: new Map(),
    interruptResolved: new Map(),
  };
}

function indexRunEvents(
  events: readonly AgentEvent[],
  runId: string | null,
): RunEventIndex {
  const index = emptyRunEventIndex();
  if (!runId) return index;

  const seenEventIds = new Set<string>();
  const runEvents = events
    .filter((event) => event.runId === runId)
    .filter((event) => {
      if (seenEventIds.has(event.eventId)) return false;
      seenEventIds.add(event.eventId);
      return true;
    })
    .sort((left, right) => left.logicalSequence - right.logicalSequence);

  for (const event of runEvents) {
    switch (event.type) {
      case "run.started":
        index.runStartedAt ??= event.timestamp;
        break;
      case "message.started":
        index.messageSequence.set(
          event.messageId,
          index.messageSequence.get(event.messageId) ?? event.logicalSequence,
        );
        index.messageStartedAt.set(
          event.messageId,
          index.messageStartedAt.get(event.messageId) ?? event.timestamp,
        );
        break;
      case "message.part.delta":
        index.messageSequence.set(
          event.messageId,
          index.messageSequence.get(event.messageId) ?? event.logicalSequence,
        );
        index.messageStartedAt.set(
          event.messageId,
          index.messageStartedAt.get(event.messageId) ?? event.timestamp,
        );
        if (event.part.type === "reasoning") {
          index.reasoningStartedAt.set(
            event.messageId,
            index.reasoningStartedAt.get(event.messageId) ?? event.timestamp,
          );
        }
        break;
      case "message.completed":
        index.completedMessages.add(event.messageId);
        index.messageSequence.set(
          event.messageId,
          index.messageSequence.get(event.messageId) ?? event.logicalSequence,
        );
        index.messageCompletedAt.set(event.messageId, event.timestamp);
        break;
      case "tool.called":
        index.toolSequence.set(
          event.toolCall.toolCallId,
          index.toolSequence.get(event.toolCall.toolCallId) ??
            event.logicalSequence,
        );
        index.toolStartedAt.set(
          event.toolCall.toolCallId,
          index.toolStartedAt.get(event.toolCall.toolCallId) ?? event.timestamp,
        );
        break;
      case "tool.progress":
        index.toolProgress.set(event.toolCallId, [
          ...(index.toolProgress.get(event.toolCallId) ?? []),
          ...event.content,
        ]);
        break;
      case "tool.completed":
        index.toolCompletedAt.set(event.result.toolCallId, event.timestamp);
        break;
      case "tool.failed":
        index.toolCompletedAt.set(event.error.toolCallId, event.timestamp);
        break;
      case "interrupt.required":
        index.interruptRequired.set(event.interrupt.interruptId, event);
        break;
      case "interrupt.resolved":
        index.interruptResolved.set(event.interruptId, event);
        break;
      case "run.completed":
        index.terminalAt = event.timestamp;
        index.completionContent = event.content;
        break;
      case "run.failed":
        index.terminalAt = event.timestamp;
        index.runError = event;
        break;
      case "run.cancelled":
        index.terminalAt = event.timestamp;
        index.cancellation = event;
        break;
      case "usage.updated":
        // Usage is retained on the canonical reducer snapshot. The event is
        // still part of the ordered protocol history even though it has no
        // transcript item of its own.
        break;
    }
  }

  return index;
}

function isRunActive(status: AgentReducerState["status"]): boolean {
  return status === "running" || status === "waiting";
}

function messageState(
  run: AgentReducerState,
  role: AgentReducerMessage["role"],
  completed: boolean,
): RenderMessage["state"] {
  if (run.status === "cancelled" && !completed) return "stopped";
  if (run.status === "failed" && !completed) return "error";
  if (role === "assistant" && isRunActive(run.status) && !completed) {
    return "streaming";
  }
  return "complete";
}

function contentWithoutProtocolParts(
  message: AgentReducerMessage,
): ContentPart[] {
  return message.content.filter(
    (part) =>
      part.type !== "tool-call" &&
      part.type !== "tool-result" &&
      (message.role !== "assistant" || part.type !== "reasoning"),
  );
}

function reasoningForMessage(
  message: AgentReducerMessage,
  run: AgentReducerState,
  index: RunEventIndex,
): RenderReasoning | undefined {
  if (message.role !== "assistant") return undefined;
  const parts = message.content.filter(
    (part): part is Extract<ContentPart, { type: "reasoning" }> =>
      part.type === "reasoning",
  );
  if (parts.length === 0) return undefined;

  return {
    text: parts.map((part) => part.text).join(""),
    state:
      isRunActive(run.status) && !index.completedMessages.has(message.messageId)
        ? "streaming"
        : "complete",
    ...(index.reasoningStartedAt.has(message.messageId)
      ? { startedAt: index.reasoningStartedAt.get(message.messageId) }
      : index.messageStartedAt.has(message.messageId)
        ? { startedAt: index.messageStartedAt.get(message.messageId) }
        : {}),
    ...(index.messageCompletedAt.has(message.messageId)
      ? { completedAt: index.messageCompletedAt.get(message.messageId) }
      : index.terminalAt
        ? { completedAt: index.terminalAt }
        : {}),
  };
}

function toolStatus(
  hasResult: boolean,
  resultIsError: boolean,
  hasError: boolean,
  isApproval: boolean,
): RenderToolStatus {
  if (hasError || resultIsError) return "failed";
  if (hasResult) return "complete";
  if (isApproval) return "approval";
  return "running";
}

function toolErrorFromResult(output: JsonValue): string {
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output) || "Tool returned an error.";
  } catch {
    return "Tool returned an error.";
  }
}

function buildTool(
  run: AgentReducerState,
  index: RunEventIndex,
  toolCallId: string,
  isApproval: boolean,
): RenderTool | undefined {
  const call = run.toolCalls.find((item) => item.toolCallId === toolCallId);
  if (!call) return undefined;
  const progress =
    index.toolProgress.get(toolCallId) ??
    run.toolProgress.find((item) => item.toolCallId === toolCallId)?.content ??
    [];
  const result = run.toolResults.find((item) => item.toolCallId === toolCallId);
  const error = run.toolErrors.find((item) => item.toolCallId === toolCallId);
  const status = toolStatus(
    Boolean(result),
    result?.isError === true,
    Boolean(error),
    isApproval,
  );

  return {
    toolCallId,
    name: call.name,
    input: call.input,
    progress,
    ...(result ? { output: result.output } : {}),
    ...(error
      ? { error: error.error, ...(error.code ? { errorCode: error.code } : {}) }
      : result?.isError
        ? { error: toolErrorFromResult(result.output) }
        : {}),
    status,
    ...(index.toolStartedAt.has(toolCallId)
      ? { startedAt: index.toolStartedAt.get(toolCallId) }
      : {}),
    ...(index.toolCompletedAt.has(toolCallId)
      ? { completedAt: index.toolCompletedAt.get(toolCallId) }
      : {}),
  };
}

function toolIdFromMessage(message: AgentReducerMessage): string | undefined {
  for (const part of message.content) {
    if (part.type === "tool-call") return part.toolCall.toolCallId;
    if (part.type === "tool-result") return part.result.toolCallId;
  }
  return undefined;
}

function buildApproval(
  index: RunEventIndex,
  interruptId: string,
): RenderApproval | undefined {
  const required = index.interruptRequired.get(interruptId);
  if (!required) return undefined;
  const resolved = index.interruptResolved.get(interruptId);
  return {
    interruptId,
    kind: required.interrupt.kind,
    title:
      required.interrupt.kind === "tool-approval"
        ? "Tool approval required"
        : "Agent interruption",
    detail: required.interrupt.prompt,
    actions: required.interrupt.actions.map((action) => ({
      id: action.id,
      label: action.name,
      kind: "custom",
      input: action.input,
      ...("toolCallId" in action && typeof action.toolCallId === "string"
        ? { toolCallId: action.toolCallId }
        : {}),
    })),
    state: resolved ? "resolved" : "pending",
    decisions: resolved?.decisions ?? [],
    ...(required.interrupt.payload !== undefined
      ? { payload: required.interrupt.payload }
      : {}),
  };
}

function runError(index: RunEventIndex): RenderError | undefined {
  if (!index.runError) return undefined;
  return {
    title: "Agent run failed",
    detail: index.runError.message,
    retryable: false,
    scope: "run",
    code: index.runError.code,
  };
}

function approvalForToolCall(
  approval: RenderApproval | undefined,
  toolCallId: string,
): RenderApproval | undefined {
  if (approval?.kind !== "tool-approval") return undefined;
  const actions = approval.actions.filter(
    (action) => action.toolCallId === toolCallId,
  );
  return actions.length > 0 ? { ...approval, actions } : undefined;
}

function sameContent(
  left: readonly ContentPart[],
  right: readonly ContentPart[],
): boolean {
  const normalize = (parts: readonly ContentPart[]) => {
    const normalized: ContentPart[] = [];
    for (const part of parts) {
      if (
        part.type === "tool-call" ||
        part.type === "tool-result" ||
        part.type === "reasoning"
      ) {
        continue;
      }
      const previous = normalized.at(-1);
      if (part.type === "text" && previous?.type === "text") {
        normalized[normalized.length - 1] = {
          type: "text",
          text: previous.text + part.text,
        };
      } else {
        normalized.push(part);
      }
    }
    return normalized;
  };
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function renderRun(
  run: AgentReducerState,
  events: readonly AgentEvent[],
  runIndex: number,
): RenderTurn {
  const index = indexRunEvents(events, run.runId);
  const approval = run.interrupt
    ? buildApproval(index, run.interrupt.interruptId)
    : run.interruptResolution
      ? buildApproval(index, run.interruptResolution.interruptId)
      : undefined;
  const entries: RenderEntry[] = [];
  const representedToolIds = new Set<string>();

  run.messages.forEach((message, messageIndex) => {
    const toolId =
      message.role === "tool" ? toolIdFromMessage(message) : undefined;
    const messageApproval = toolId
      ? approvalForToolCall(approval, toolId)
      : undefined;
    const tool = toolId
      ? buildTool(run, index, toolId, Boolean(messageApproval))
      : undefined;
    if (toolId) representedToolIds.add(toolId);
    const content = contentWithoutProtocolParts(message);
    const reasoning = reasoningForMessage(message, run, index);
    if (message.role === "assistant" && content.length === 0 && !reasoning)
      return;
    entries.push({
      message: {
        id: message.messageId,
        runId: run.runId,
        role: message.role,
        content,
        state: messageState(
          run,
          message.role,
          index.completedMessages.has(message.messageId),
        ),
        ...(reasoning ? { reasoning } : {}),
        ...(tool ? { tool } : {}),
        ...(messageApproval ? { approval: messageApproval } : {}),
      },
      order:
        index.messageSequence.get(message.messageId) ??
        (message.role === "user" ? -1 : 10_000 + messageIndex),
      tieBreaker: messageIndex,
    });
  });

  run.toolCalls.forEach((call, toolIndex) => {
    if (representedToolIds.has(call.toolCallId)) return;
    const callApproval = approvalForToolCall(approval, call.toolCallId);
    const tool = buildTool(run, index, call.toolCallId, Boolean(callApproval));
    if (!tool) return;
    entries.push({
      message: {
        id: `tool-${run.runId ?? runIndex}-${call.toolCallId}`,
        runId: run.runId,
        role: "tool",
        content: tool.progress,
        state:
          run.status === "cancelled" && tool.status === "running"
            ? "stopped"
            : tool.status === "running" || tool.status === "approval"
              ? "streaming"
              : "complete",
        tool,
        ...(callApproval ? { approval: callApproval } : {}),
      },
      order: index.toolSequence.get(call.toolCallId) ?? 20_000 + toolIndex,
      tieBreaker: run.messages.length + toolIndex,
    });
  });

  if (
    approval &&
    (approval.kind === "custom" ||
      (approval.kind === "tool-approval" &&
        !approval.actions.some((action) =>
          run.toolCalls.some((call) => call.toolCallId === action.toolCallId),
        )))
  ) {
    entries.push({
      message: {
        id: `interrupt-${run.runId ?? runIndex}-${approval.interruptId}`,
        runId: run.runId,
        role: "assistant",
        content: [],
        state: approval.state === "pending" ? "streaming" : "complete",
        approval,
      },
      order:
        index.interruptRequired.get(approval.interruptId)?.logicalSequence ??
        30_000,
      tieBreaker: run.messages.length + run.toolCalls.length,
    });
  }

  const error = runError(index);
  if (error) {
    const latestAssistant = [...entries]
      .reverse()
      .find((entry) => entry.message.role === "assistant");
    if (latestAssistant) {
      latestAssistant.message = {
        ...latestAssistant.message,
        state: "error",
        error,
      };
    } else {
      entries.push({
        message: {
          id: `run-error-${run.runId ?? runIndex}`,
          runId: run.runId,
          role: "assistant",
          content: [],
          state: "error",
          error,
        },
        order: index.terminalAt ? 40_000 : 30_000,
        tieBreaker: entries.length,
      });
    }
  }

  if (index.completionContent && index.completionContent.length > 0) {
    const existingAssistant = [...entries]
      .reverse()
      .find((entry) => entry.message.role === "assistant");
    const alreadyRendered = run.messages.some(
      (message) =>
        message.role === "assistant" &&
        sameContent(message.content, index.completionContent ?? []),
    );
    const finalContent = index.completionContent.filter(
      (part) =>
        part.type !== "tool-call" &&
        part.type !== "tool-result" &&
        part.type !== "reasoning",
    );
    if (existingAssistant && !alreadyRendered) {
      existingAssistant.message = {
        ...existingAssistant.message,
        content: finalContent,
        state:
          existingAssistant.message.state === "error" ? "error" : "complete",
      };
    } else if (!alreadyRendered && finalContent.length > 0) {
      entries.push({
        message: {
          id: `run-content-${run.runId ?? runIndex}`,
          runId: run.runId,
          role: "assistant",
          content: finalContent,
          state: "complete",
        },
        order: 50_000,
        tieBreaker: entries.length,
      });
    }
  }

  const messages = entries
    .sort(
      (left, right) =>
        left.order - right.order || left.tieBreaker - right.tieBreaker,
    )
    .map((entry) => entry.message);
  const state: RenderTurn["state"] =
    run.status === "cancelled" ? "stopped" : run.status;

  return {
    id: run.runId ?? `pending-${runIndex}`,
    runId: run.runId,
    sessionId: run.threadId,
    state,
    messages,
    items: projectTurnItems(run, events),
    usage: run.usage,
    limit: run.limit,
    finishReason: run.finishReason,
    cancellationReason: index.cancellation?.reason ?? run.cancellationReason,
    ...(index.runStartedAt ? { startedAt: index.runStartedAt } : {}),
    ...(index.terminalAt ? { completedAt: index.terminalAt } : {}),
    ...(error ? { error } : {}),
  };
}

function transportError(
  status: RenderMessageSource["streamStatus"],
  value: unknown,
): RenderTransportError | undefined {
  if (status !== "error" && value == null) return undefined;
  const detail =
    "The connection ended unexpectedly. Your messages are still here.";
  return {
    title: "Agent stream error",
    detail,
    retryable: false,
    scope: "transport",
  };
}

function samePart(left: ContentPart, right: ContentPart): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeProgress(
  previous: readonly ContentPart[],
  current: readonly ContentPart[],
): readonly ContentPart[] {
  if (previous.length === 0) return current;
  if (current.length === 0) return previous;

  const maximumOverlap = Math.min(previous.length, current.length);
  for (let overlap = maximumOverlap; overlap > 0; overlap -= 1) {
    const previousSuffix = previous.slice(previous.length - overlap);
    const currentPrefix = current.slice(0, overlap);
    if (
      previousSuffix.every((part, index) =>
        samePart(part, currentPrefix[index]!),
      )
    ) {
      return [...previous, ...current.slice(overlap)];
    }
  }
  return [...previous, ...current];
}

function mergeRenderTool(
  previous: RenderTool,
  current: RenderTool,
): RenderTool {
  return {
    ...previous,
    ...current,
    progress: mergeProgress(previous.progress, current.progress),
    ...(current.output !== undefined
      ? { output: current.output }
      : previous.output !== undefined
        ? { output: previous.output }
        : {}),
    ...(current.error !== undefined
      ? { error: current.error }
      : previous.error !== undefined
        ? { error: previous.error }
        : {}),
    ...(current.errorCode !== undefined
      ? { errorCode: current.errorCode }
      : previous.errorCode !== undefined
        ? { errorCode: previous.errorCode }
        : {}),
    ...((current.startedAt ?? previous.startedAt)
      ? { startedAt: current.startedAt ?? previous.startedAt }
      : {}),
    ...((current.completedAt ?? previous.completedAt)
      ? { completedAt: current.completedAt ?? previous.completedAt }
      : {}),
  };
}

function mergeRenderMessage(
  previous: RenderMessage,
  current: RenderMessage,
): RenderMessage {
  return {
    ...previous,
    ...current,
    content: current.content.length > 0 ? current.content : previous.content,
    ...(current.reasoning
      ? { reasoning: current.reasoning }
      : previous.reasoning
        ? { reasoning: previous.reasoning }
        : {}),
    ...(current.tool
      ? {
          tool: previous.tool
            ? mergeRenderTool(previous.tool, current.tool)
            : current.tool,
        }
      : previous.tool
        ? { tool: previous.tool }
        : {}),
    ...(current.approval
      ? { approval: current.approval }
      : previous.approval
        ? { approval: previous.approval }
        : {}),
    ...(current.error
      ? { error: current.error }
      : previous.error
        ? { error: previous.error }
        : {}),
  };
}

function mergeRenderTurn(
  previous: RenderTurn,
  current: RenderTurn,
): RenderTurn {
  const previousMessages = new Map(
    previous.messages.map((message) => [message.id, message] as const),
  );
  const messages = current.messages.map((message) => {
    const prior = previousMessages.get(message.id);
    return prior ? mergeRenderMessage(prior, message) : message;
  });
  const currentMessageIds = new Set(
    current.messages.map((message) => message.id),
  );
  messages.push(
    ...previous.messages.filter(
      (message) => !currentMessageIds.has(message.id),
    ),
  );
  return {
    ...previous,
    ...current,
    messages,
    ...((current.usage ?? previous.usage)
      ? { usage: current.usage ?? previous.usage }
      : { usage: null }),
    ...((current.limit ?? previous.limit)
      ? { limit: current.limit ?? previous.limit }
      : { limit: null }),
    ...((current.finishReason ?? previous.finishReason)
      ? { finishReason: current.finishReason ?? previous.finishReason }
      : { finishReason: null }),
    ...((current.cancellationReason ?? previous.cancellationReason)
      ? {
          cancellationReason:
            current.cancellationReason ?? previous.cancellationReason,
        }
      : { cancellationReason: null }),
    ...((current.startedAt ?? previous.startedAt)
      ? { startedAt: current.startedAt ?? previous.startedAt }
      : {}),
    ...((current.completedAt ?? previous.completedAt)
      ? { completedAt: current.completedAt ?? previous.completedAt }
      : {}),
    ...(current.error
      ? { error: current.error }
      : previous.error
        ? { error: previous.error }
        : {}),
  };
}

/** Convert canonical reducer snapshots into the framework-independent render model. */
export function selectRenderModel({
  runs,
  events,
  history = [],
  streamStatus = "idle",
  streamError = null,
}: RenderMessageSource): RenderModel {
  const historicalById = new Map(
    history
      .filter((turn) => turn.runId !== null)
      .map((turn) => [turn.runId, turn] as const),
  );
  const turns = runs.map((run, index) => {
    const current = renderRun(run, events, index);
    const historical =
      current.runId === null ? undefined : historicalById.get(current.runId);
    const turn = historical ? mergeRenderTurn(historical, current) : current;
    turn.transportState =
      index === runs.length - 1
        ? streamStatus
        : (historical?.transportState ?? "closed");
    if (
      index < runs.length - 1 ||
      turn.transportState === "stopped" ||
      turn.transportState === "error" ||
      turn.transportState === "closed"
    ) {
      turn.items = turn.items.map((item) =>
        item.type === "message" && item.state === "streaming"
          ? {
              ...item,
              state: "stopped",
              blocks: item.blocks.map((block) =>
                block.state === "streaming"
                  ? { ...block, state: "stopped" }
                  : block,
              ),
            }
          : item.type === "tool-call"
            ? { ...item, active: false }
            : item.type === "tool-timeline"
              ? {
                  ...item,
                  tools: item.tools.map((tool) => ({ ...tool, active: false })),
                }
              : item,
      );
    }
    return turn;
  });
  const normalizedTransportError = transportError(streamStatus, streamError);
  return {
    turns,
    messages: turns.flatMap((turn) => turn.messages),
    streamStatus,
    ...(normalizedTransportError
      ? { transportError: normalizedTransportError }
      : {}),
  };
}

/** Backward-compatible flat message selector for existing React consumers. */
export function selectRenderMessages(
  source: RenderMessageSource,
): RenderMessage[] {
  return [...selectRenderModel(source).messages];
}
