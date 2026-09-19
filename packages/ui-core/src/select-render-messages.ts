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
  interruptRequired: Map<string, Extract<AgentEvent, { type: "interrupt.required" }>>;
  interruptResolved: Map<string, Extract<AgentEvent, { type: "interrupt.resolved" }>>;
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
          index.toolSequence.get(event.toolCall.toolCallId) ?? event.logicalSequence,
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
  toolCallId: string,
  hasResult: boolean,
  resultIsError: boolean,
  hasError: boolean,
  approvalToolCallId: string | undefined,
): RenderToolStatus {
  if (hasError || resultIsError) return "failed";
  if (hasResult) return "complete";
  if (approvalToolCallId === toolCallId) return "approval";
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

function unresolvedToolCallId(run: AgentReducerState): string | undefined {
  return [...run.toolCalls]
    .reverse()
    .find(
      (call) =>
        !run.toolResults.some((result) => result.toolCallId === call.toolCallId) &&
        !run.toolErrors.some((error) => error.toolCallId === call.toolCallId),
    )?.toolCallId;
}

function buildTool(
  run: AgentReducerState,
  index: RunEventIndex,
  toolCallId: string,
  approvalToolCallId: string | undefined,
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
    toolCallId,
    Boolean(result),
    result?.isError === true,
    Boolean(error),
    approvalToolCallId,
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

function actionKind(name: string): RenderApprovalAction["kind"] {
  const normalized = name.toLowerCase();
  if (/(approve|allow|accept|yes)/.test(normalized)) return "approve";
  if (/(deny|reject|decline|no)/.test(normalized)) return "deny";
  return "custom";
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
      kind: actionKind(action.name),
      input: action.input,
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

function sameContent(left: readonly ContentPart[], right: readonly ContentPart[]): boolean {
  const normalize = (parts: readonly ContentPart[]) => {
    const normalized: ContentPart[] = [];
    for (const part of parts) {
      if (part.type === "tool-call" || part.type === "tool-result" || part.type === "reasoning") {
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
  const approvalToolCallId =
    approval?.kind === "tool-approval"
      ? unresolvedToolCallId(run) ?? run.toolCalls.at(-1)?.toolCallId
      : undefined;
  const entries: RenderEntry[] = [];
  const representedToolIds = new Set<string>();

  run.messages.forEach((message, messageIndex) => {
    const toolId = message.role === "tool" ? toolIdFromMessage(message) : undefined;
    const tool = toolId
      ? buildTool(run, index, toolId, approvalToolCallId)
      : undefined;
    if (toolId) representedToolIds.add(toolId);
    const content = contentWithoutProtocolParts(message);
    const reasoning = reasoningForMessage(message, run, index);
    if (message.role === "assistant" && content.length === 0 && !reasoning) return;
    const messageApproval =
      toolId &&
      approval?.kind === "tool-approval" &&
      (toolId === approvalToolCallId || approval.state === "resolved")
        ? approval
        : undefined;
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
    const tool = buildTool(run, index, call.toolCallId, approvalToolCallId);
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
        ...(approval &&
        approval.kind === "tool-approval" &&
        (call.toolCallId === approvalToolCallId || approval.state === "resolved")
          ? { approval }
          : {}),
      },
      order: index.toolSequence.get(call.toolCallId) ?? 20_000 + toolIndex,
      tieBreaker: run.messages.length + toolIndex,
    });
  });

  if (approval?.kind === "custom") {
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
    if (existingAssistant && !alreadyRendered) {
      const finalContent = index.completionContent.filter(
        (part) => part.type !== "tool-call" && part.type !== "tool-result" && part.type !== "reasoning",
      );
      existingAssistant.message = {
        ...existingAssistant.message,
        content: finalContent,
        state: existingAssistant.message.state === "error" ? "error" : "complete",
      };
    } else if (!alreadyRendered) {
      entries.push({
        message: {
          id: `run-content-${run.runId ?? runIndex}`,
          runId: run.runId,
          role: "assistant",
          content: index.completionContent,
          state: "complete",
        },
        order: 50_000,
        tieBreaker: entries.length,
      });
    }
  }

  const messages = entries
    .sort((left, right) => left.order - right.order || left.tieBreaker - right.tieBreaker)
    .map((entry) => entry.message);
  const state: RenderTurn["state"] =
    run.status === "cancelled" ? "stopped" : run.status;

  return {
    id: run.runId ?? `pending-${runIndex}`,
    runId: run.runId,
    sessionId: run.sessionId,
    state,
    messages,
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
    value instanceof Error
      ? value.message
      : String(value ?? "Agent stream failed.");
  return {
    title: "Agent stream error",
    detail,
    retryable: true,
    scope: "transport",
  };
}

/** Convert canonical reducer snapshots into the framework-independent render model. */
export function selectRenderModel({
  runs,
  events,
  streamStatus = "idle",
  streamError = null,
}: RenderMessageSource): RenderModel {
  const turns = runs.map((run, index) => renderRun(run, events, index));
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
export function selectRenderMessages(source: RenderMessageSource): RenderMessage[] {
  return [...selectRenderModel(source).messages];
}
