import type { AgentReducerState } from "@agentdock-ai/contracts";
import { projectTurnItems } from "./project-turn-items.js";
import { projectHistory } from "./history.js";
import type {
  RenderModel,
  RenderModelSource,
  RenderTurn,
  RenderTurnItem,
} from "./render-model.js";

export type { RenderModelSource } from "./render-model.js";

function stopActivity(item: RenderTurnItem): RenderTurnItem {
  switch (item.type) {
    case "message":
      if (item.state !== "streaming") return item;
      return {
        ...item,
        state: "stopped",
        blocks: item.blocks.map((block) =>
          block.state === "streaming" ? { ...block, state: "stopped" } : block,
        ),
      };
    case "tool-call":
      return { ...item, active: false };
    case "tool-timeline":
      return {
        ...item,
        tools: item.tools.map((tool) => ({ ...tool, active: false })),
      };
    default:
      return item;
  }
}

function turnState(run: AgentReducerState): RenderTurn["state"] {
  return run.status === "cancelled" ? "stopped" : run.status;
}

/** Project one ordered transcript from the complete accepted events for each turn. */
export function selectRenderModel({
  history = [],
  historyContinuation = false,
  runs,
  turnEvents,
  turnStreamStatuses,
  streamStatus = "idle",
  streamError = null,
}: RenderModelSource): RenderModel {
  if (runs.length !== turnEvents.length) {
    throw new Error("Each run must have a corresponding turn event history.");
  }
  const liveTurns = runs.map((run, index): RenderTurn => {
    const events = turnEvents[index]!;
    const started = events.find((event) => event.type === "run.started");
    const terminal = [...events]
      .reverse()
      .find(
        (event) =>
          event.type === "run.completed" ||
          event.type === "run.failed" ||
          event.type === "run.cancelled",
      );
    const transportState =
      index === runs.length - 1
        ? streamStatus
        : (turnStreamStatuses?.[index] ?? "closed");
    let items = projectTurnItems(run, events);
    if (
      transportState === "closed" ||
      transportState === "stopped" ||
      transportState === "error"
    ) {
      items = items.map(stopActivity);
    }
    const errorItem = items.find((item) => item.type === "error");
    return {
      id: run.runId ?? `pending-${index}`,
      runId: run.runId,
      sessionId: run.threadId,
      state: turnState(run),
      items,
      transportState,
      usage: run.usage,
      limit: run.limit,
      finishReason: run.finishReason,
      cancellationReason: run.cancellationReason,
      ...(started ? { startedAt: started.timestamp } : {}),
      ...(terminal ? { completedAt: terminal.timestamp } : {}),
      ...(errorItem?.type === "error" ? { error: errorItem.error } : {}),
    };
  });
  const turns = projectHistory(history);
  const historyTurnCount = turns.length;
  for (const [index, live] of liveTurns.entries()) {
    const messageIds = new Set(
      live.items.flatMap((item) =>
        item.type === "message" ? [item.messageId] : [],
      ),
    );
    const toolIds = new Set(
      live.items.flatMap((item) =>
        item.type === "tool-call"
          ? [item.tool.toolCallId]
          : item.type === "tool-timeline"
            ? item.tools.map((tool) => tool.tool.toolCallId)
            : [],
      ),
    );
    let target = turns
      .slice(0, historyTurnCount)
      .findIndex((turn) =>
        turn.items.some((item) =>
          item.type === "message"
            ? messageIds.has(item.messageId)
            : item.type === "tool-call" && toolIds.has(item.tool.toolCallId),
        ),
      );
    if (target < 0 && index === 0 && historyContinuation && turns.length)
      target = turns.length - 1;
    if (target < 0) {
      turns.push(live);
      continue;
    }
    const previous = turns[target]!;
    const overlaps = (item: RenderTurnItem) =>
      item.type === "message"
        ? messageIds.has(item.messageId)
        : item.type === "tool-call" && toolIds.has(item.tool.toolCallId);
    const anchor = previous.items.findIndex(overlaps);
    const items =
      anchor < 0
        ? [...previous.items, ...live.items]
        : [
            ...previous.items.slice(0, anchor),
            ...live.items,
            ...previous.items.slice(anchor).filter((item) => !overlaps(item)),
          ];
    const pendingTools = new Set(
      items.flatMap((item) =>
        item.type === "approval" && item.approval.state === "pending"
          ? item.approval.actions.flatMap((action) =>
              action.toolCallId ? [action.toolCallId] : [],
            )
          : [],
      ),
    );
    turns[target] = {
      ...live,
      id: previous.id,
      items: items.map((item) =>
        item.type === "tool-call" && pendingTools.has(item.tool.toolCallId)
          ? {
              ...item,
              active: false,
              tool: { ...item.tool, status: "approval" },
            }
          : item,
      ),
    };
  }
  return {
    turns,
    streamStatus,
    ...(streamStatus === "error" || streamError != null
      ? {
          transportError: {
            title: "Agent stream error",
            detail:
              "The connection ended unexpectedly. Your messages are still here.",
            retryable: false,
            scope: "transport",
          },
        }
      : {}),
  };
}
