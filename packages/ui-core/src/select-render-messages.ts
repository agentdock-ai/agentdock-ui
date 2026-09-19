import type {
  AgentEvent,
  AgentReducerMessage,
  AgentReducerState,
} from "@agentdock-ai/contracts";
import type { RenderMessage, RenderTool, RenderToolStatus } from "./render-model.js";
import type { RenderMessageSource } from "./render-model.js";

export type { RenderMessageSource } from "./render-model.js";

interface RunEventIndex {
  messageSequence: Map<string, number>;
  completedMessages: Set<string>;
  toolSequence: Map<string, number>;
}

interface RenderEntry {
  message: RenderMessage;
  order: number;
  tieBreaker: number;
}

function indexRunEvents(events: readonly AgentEvent[], runId: string | null): RunEventIndex {
  const index: RunEventIndex = {
    messageSequence: new Map(),
    completedMessages: new Set(),
    toolSequence: new Map(),
  };
  if (!runId) return index;

  for (const event of events) {
    if (event.runId !== runId) continue;
    const sequence = event.logicalSequence;
    if (event.type === "message.started" || event.type === "message.part.delta") {
      if (!index.messageSequence.has(event.messageId))
        index.messageSequence.set(event.messageId, sequence);
    } else if (event.type === "message.completed") {
      index.completedMessages.add(event.messageId);
      if (!index.messageSequence.has(event.messageId))
        index.messageSequence.set(event.messageId, sequence);
    } else if (event.type === "tool.called") {
      index.toolSequence.set(event.toolCall.toolCallId, sequence);
    }
  }
  return index;
}

function isRunActive(status: AgentReducerState["status"]): boolean {
  return status === "running" || status === "waiting";
}

function toolStatus(
  run: AgentReducerState,
  toolCallId: string,
  hasResult: boolean,
  hasError: boolean,
): RenderToolStatus {
  if (hasError) return "failed";
  if (hasResult) return "complete";
  if (
    run.status === "waiting" &&
    run.interrupt?.kind === "tool-approval" &&
    run.toolCalls.some((call) => call.toolCallId === toolCallId)
  ) {
    return "approval";
  }
  return "running";
}

function buildTool(
  run: AgentReducerState,
  toolCallId: string,
): RenderTool | undefined {
  const call = run.toolCalls.find((item) => item.toolCallId === toolCallId);
  if (!call) return undefined;
  const progress = run.toolProgress.find((item) => item.toolCallId === toolCallId);
  const result = run.toolResults.find((item) => item.toolCallId === toolCallId);
  const error = run.toolErrors.find((item) => item.toolCallId === toolCallId);
  return {
    toolCallId,
    name: call.name,
    input: call.input,
    progress: progress?.content ?? [],
    ...(result ? { output: result.output } : {}),
    ...(error ? { error: error.error } : {}),
    status: toolStatus(run, toolCallId, Boolean(result), Boolean(error) || result?.isError === true),
  };
}

function toolIdFromMessage(message: AgentReducerMessage): string | undefined {
  for (const part of message.content) {
    if (part.type === "tool-call") return part.toolCall.toolCallId;
    if (part.type === "tool-result") return part.result.toolCallId;
  }
  return undefined;
}

function renderableMessageContent(message: AgentReducerMessage) {
  if (message.role !== "assistant") return message.content;
  // Tool lifecycle is rendered by the normalized tool message below. Keeping
  // protocol parts in the assistant bubble creates duplicate tool chips.
  return message.content.filter(
    (part) => part.type !== "tool-call" && part.type !== "tool-result",
  );
}

function renderRun(
  run: AgentReducerState,
  events: readonly AgentEvent[],
  runIndex: number,
): RenderMessage[] {
  const eventIndex = indexRunEvents(events, run.runId);
  const entries: RenderEntry[] = [];
  const representedToolIds = new Set<string>();

  run.messages.forEach((message, messageIndex) => {
    const toolId = message.role === "tool" ? toolIdFromMessage(message) : undefined;
    const tool = toolId ? buildTool(run, toolId) : undefined;
    if (toolId) representedToolIds.add(toolId);
    const content = renderableMessageContent(message);
    if (message.role === "assistant" && content.length === 0) return;
    const state: RenderMessage["state"] =
      message.role === "assistant" &&
      isRunActive(run.status) &&
      !eventIndex.completedMessages.has(message.messageId)
        ? "streaming"
        : "complete";
    entries.push({
      message: {
        id: message.messageId,
        role: message.role,
        content,
        state,
        ...(tool ? { tool } : {}),
      },
      order:
        eventIndex.messageSequence.get(message.messageId) ??
        (message.role === "user" ? -1 : 10_000 + messageIndex),
      tieBreaker: messageIndex,
    });
  });

  run.toolCalls.forEach((call, toolIndex) => {
    if (representedToolIds.has(call.toolCallId)) return;
    const tool = buildTool(run, call.toolCallId);
    if (!tool) return;
    entries.push({
      message: {
        id: `tool-${run.runId ?? runIndex}-${call.toolCallId}`,
        role: "tool",
        content: tool.progress,
        state: tool.status === "running" || tool.status === "approval" ? "streaming" : "complete",
        tool,
      },
      order: eventIndex.toolSequence.get(call.toolCallId) ?? 20_000 + toolIndex,
      tieBreaker: run.messages.length + toolIndex,
    });
  });

  return entries
    .sort((left, right) => left.order - right.order || left.tieBreaker - right.tieBreaker)
    .map((entry) => entry.message);
}

/** Convert canonical reducer snapshots into one render-ready message list. */
export function selectRenderMessages({
  runs,
  events,
}: RenderMessageSource): RenderMessage[] {
  return runs.flatMap((run, runIndex) => renderRun(run, events, runIndex));
}
