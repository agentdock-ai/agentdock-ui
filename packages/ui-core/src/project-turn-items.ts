import type {
  AgentEvent,
  AgentReducerState,
  ContentPart,
  ToolCallRecord,
  JsonValue,
} from "@agentdock-ai/contracts";
import type {
  RenderApprovalItem,
  RenderMessageItem,
  RenderMessageState,
  RenderToolCallItem,
  RenderTurnItem,
} from "./render-model.js";
import { normalizeContent } from "./normalize-content.js";
import { reconcileBlocks } from "./reconcile-blocks.js";

/** Placement metadata only. Validation, replay and lifecycle belong to the canonical reducer. */
export function projectTurnItems(
  run: AgentReducerState,
  events: readonly AgentEvent[],
): RenderTurnItem[] {
  const seen = new Set<string>();
  // The canonical eventIds list is a bounded replay window, not transcript history.
  // Store events have already passed the canonical reducer before reaching this projection.
  const source = events.filter((event) => {
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId);
    return true;
  });
  const items: RenderTurnItem[] = [];
  const messages = new Map<string, RenderMessageItem[]>();
  const tools = new Map<string, RenderToolCallItem>();
  const approvals = new Map<string, RenderApprovalItem>();
  const completed = new Set<string>();
  const running = run.status === "running" || run.status === "waiting";
  let state: RenderMessageState = "complete";
  if (run.status === "cancelled") state = "stopped";
  else if (run.status === "failed") state = "error";
  else if (running) state = "streaming";
  const base = (id: string, position: number, phaseId: string | null) => ({
    id,
    runId: run.runId,
    phaseId,
    position,
  });
  let lastVisible: string | undefined;

  function tool(
    call: ToolCallRecord,
    position: number,
    phaseId: string | null,
  ) {
    let item = tools.get(call.toolCallId);
    if (!item) {
      item = {
        ...base(`tool-${call.toolCallId}`, position, phaseId),
        type: "tool-call",
        active: running,
        tool: { ...call, progress: [], status: "running" },
      };
      tools.set(call.toolCallId, item);
      items.push(item);
      lastVisible = item.id;
    }
    return item;
  }

  function append(
    messageId: string,
    role: RenderMessageItem["role"],
    part: ContentPart,
    position: number,
    phaseId: string | null,
    timestamp?: string,
  ) {
    if (part.type === "tool-call") {
      tool(part.toolCall, position, phaseId);
      return;
    }
    if (part.type === "tool-result") {
      const item = tool(part.result, position, phaseId);
      item.tool.output = part.result.output;
      item.tool.status = part.result.isError ? "failed" : "complete";
      if (part.result.isError)
        item.tool.error = resultError(part.result.output);
      item.active = false;
      return;
    }
    const segments = messages.get(messageId) ?? [];
    let segment = segments.at(-1);
    if (!segment || lastVisible !== segment.id) {
      segment = {
        ...base(`${messageId}:${segments.length}`, position, phaseId),
        type: "message",
        messageId,
        role,
        state: role === "user" ? "complete" : state,
        blocks: [],
      };
      segments.push(segment);
      messages.set(messageId, segments);
      items.push(segment);
    }
    const blocks = [...segment.blocks];
    const last = blocks.at(-1);
    if (
      (part.type === "text" || part.type === "reasoning") &&
      last?.type === part.type
    ) {
      blocks[blocks.length - 1] = { ...last, text: last.text + part.text };
    } else {
      blocks.push({
        ...part,
        id: `${segment.id}:block-${blocks.length}`,
        position,
        state: segment.state,
        startedAt: timestamp,
      });
    }
    segment.blocks = blocks;
    lastVisible = segment.id;
  }

  // Locally submitted messages have no wire events. They precede that run's output.
  for (const message of run.messages) {
    if (
      message.role === "user" &&
      !source.some((e) => "messageId" in e && e.messageId === message.messageId)
    ) {
      for (const part of message.content)
        append(message.messageId, message.role, part, -1, null);
      completed.add(message.messageId);
    }
  }

  for (const [p, event] of source.entries()) {
    switch (event.type) {
      case "message.part.delta": {
        const message = run.messages.find(
          (m) => m.messageId === event.messageId,
        );
        if (!message)
          throw new Error("Turn event history references an unknown message.");
        append(
          event.messageId,
          message.role,
          event.part,
          p,
          event.phaseId,
          event.timestamp,
        );
        break;
      }
      case "message.completed": {
        const segments = messages.get(event.messageId);
        if (segments)
          reconcileBlocks(segments, event.content, (part) =>
            append(
              event.messageId,
              event.role,
              part,
              p,
              event.phaseId,
              event.timestamp,
            ),
          );
        else
          for (const part of event.content)
            append(
              event.messageId,
              event.role,
              part,
              p,
              event.phaseId,
              event.timestamp,
            );
        completed.add(event.messageId);
        for (const segment of messages.get(event.messageId) ?? []) {
          segment.state = "complete";
          segment.blocks = segment.blocks.map((b) => ({
            ...b,
            state: "complete",
            completedAt: event.timestamp,
          }));
        }
        break;
      }
      case "tool.called":
        tool(event.toolCall, p, event.phaseId).tool.startedAt = event.timestamp;
        break;
      case "tool.progress": {
        const item = tools.get(event.toolCallId);
        if (item)
          item.tool.progress = [...item.tool.progress, ...event.content];
        break;
      }
      case "tool.completed": {
        const item = tools.get(event.result.toolCallId);
        if (item) {
          item.tool = {
            ...item.tool,
            output: event.result.output,
            status: event.result.isError ? "failed" : "complete",
            ...(event.result.isError
              ? { error: resultError(event.result.output) }
              : {}),
            completedAt: event.timestamp,
          };
          item.active = false;
        }
        break;
      }
      case "tool.failed": {
        const item = tools.get(event.error.toolCallId);
        if (item) {
          item.tool = {
            ...item.tool,
            status: "failed",
            error: event.error.error,
            errorCode: event.error.code,
            completedAt: event.timestamp,
          };
          item.active = false;
        }
        break;
      }
      case "interrupt.required": {
        const interrupt = event.interrupt;
        const associated = interrupt.actions.find(
          (a) => a.toolCallId,
        )?.toolCallId;
        const item: RenderApprovalItem = {
          ...base(`approval-${interrupt.interruptId}`, p, event.phaseId),
          type: "approval",
          toolCallId: associated,
          approval: {
            interruptId: interrupt.interruptId,
            kind: interrupt.kind,
            title:
              interrupt.kind === "tool-approval"
                ? "Your approval is needed"
                : "Your input is needed",
            detail: interrupt.prompt,
            state: "pending",
            decisions: [],
            payload: interrupt.payload,
            actions: interrupt.actions.map((a) => ({
              id: a.id,
              label: a.name,
              input: a.input,
              toolCallId: a.toolCallId,
            })),
          },
        };
        approvals.set(interrupt.interruptId, item);
        items.push(item);
        for (const action of interrupt.actions) {
          const target = tools.get(action.toolCallId ?? "");
          if (target && target.tool.status === "running")
            target.tool.status = "approval";
        }
        lastVisible = item.id;
        break;
      }
      case "interrupt.resolved": {
        const item = approvals.get(event.interruptId);
        if (item) {
          item.approval = {
            ...item.approval,
            state: "resolved",
            decisions: event.decisions,
          };
          for (const action of item.approval.actions) {
            const target = tools.get(action.toolCallId ?? "");
            if (target?.tool.status === "approval")
              target.tool.status = "running";
          }
        }
        break;
      }
      case "run.completed": {
        const final = event.content.filter(
          (p) => p.type !== "tool-call" && p.type !== "tool-result",
        );
        const assistantSegments = [...messages.values()].filter(
          (s) => s[0]?.role === "assistant",
        );
        const signature = (parts: readonly { type: string; text?: string }[]) =>
          parts.map((p) =>
            "text" in p ? `${p.type}:${p.text}` : JSON.stringify(p),
          );
        const matches = [...assistantSegments, assistantSegments.flat()].some(
          (segments) =>
            JSON.stringify(
              signature(
                normalizeContent(
                  segments.flatMap((s) =>
                    s.blocks.map(
                      ({
                        id,
                        position,
                        state,
                        startedAt,
                        completedAt,
                        ...part
                      }) => part,
                    ),
                  ),
                ),
              ),
            ) === JSON.stringify(signature(normalizeContent(final))),
        );
        if (final.length && !matches) {
          const latest = assistantSegments.at(-1);
          const messageId = latest?.[0]?.messageId ?? `final-${run.runId}`;
          if (latest)
            reconcileBlocks(latest, final, (part) =>
              append(
                messageId,
                "assistant",
                part,
                p,
                event.phaseId,
                event.timestamp,
              ),
            );
          else
            for (const part of final)
              append(
                messageId,
                "assistant",
                part,
                p,
                event.phaseId,
                event.timestamp,
              );
        }
        break;
      }
      case "run.failed":
        items.push({
          ...base(`error-${event.runId}`, p, event.phaseId),
          type: "error",
          error: {
            scope: "run",
            title: "The agent couldn’t finish",
            detail: event.message,
            code: event.code,
            retryable: false,
          },
        });
        break;
      case "run.started":
      case "message.started":
      case "usage.updated":
      case "run.cancelled":
      case "run.paused":
        break;
    }
  }

  // A fresh checkpoint seed can contain native pending controls without wire events.
  for (const interrupt of run.interrupts) {
    if (approvals.has(interrupt.interruptId)) continue;
    const item: RenderApprovalItem = {
      ...base(`approval-${interrupt.interruptId}`, source.length, null),
      type: "approval",
      toolCallId: interrupt.actions.find((action) => action.toolCallId)
        ?.toolCallId,
      approval: {
        interruptId: interrupt.interruptId,
        kind: interrupt.kind,
        title:
          interrupt.kind === "tool-approval"
            ? "Your approval is needed"
            : "Your input is needed",
        detail: interrupt.prompt,
        state: "pending",
        decisions: [],
        payload: interrupt.payload,
        actions: interrupt.actions.map((action) => ({
          id: action.id,
          label: action.name,
          input: action.input,
          toolCallId: action.toolCallId,
        })),
      },
    };
    approvals.set(interrupt.interruptId, item);
    items.push(item);
  }
  for (const item of tools.values()) {
    item.active = running && item.tool.status === "running";
  }
  for (const segments of messages.values())
    for (const segment of segments) {
      segment.state =
        segment.role === "user" || completed.has(segment.messageId)
          ? "complete"
          : state;
      segment.blocks = segment.blocks.map((b, i) => ({
        ...b,
        state:
          segment.state === "streaming" &&
          (lastVisible !== segment.id || i !== segment.blocks.length - 1)
            ? "complete"
            : segment.state,
      }));
    }
  const ordered = items
    .filter((item) => item.type !== "message" || item.blocks.length > 0)
    .sort((a, b) => a.position - b.position);
  // One interrupt card, directly after its associated tool (never duplicated per action).
  for (const item of approvals.values()) {
    const target = ordered.findIndex(
      (i) => i.type === "tool-call" && i.tool.toolCallId === item.toolCallId,
    );
    const at = ordered.indexOf(item);
    if (target >= 0 && at > target + 1) {
      ordered.splice(at, 1);
      ordered.splice(target + 1, 0, item);
    }
  }
  const grouped: RenderTurnItem[] = [];
  for (const item of ordered) {
    const previous = grouped.at(-1);
    if (
      item.type === "tool-call" &&
      item.phaseId !== null &&
      previous?.phaseId === item.phaseId
    ) {
      if (previous.type === "tool-call") {
        grouped[grouped.length - 1] = {
          ...base(previous.id, previous.position, previous.phaseId),
          type: "tool-timeline",
          tools: [previous, item],
        };
        continue;
      }
      if (previous.type === "tool-timeline") {
        previous.tools = [...previous.tools, item];
        continue;
      }
    }
    grouped.push(item);
  }
  return grouped;
}

function resultError(output: JsonValue): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    if (typeof output.error === "string") return output.error;
    if (typeof output.message === "string") return output.message;
  }
  return "The tool could not complete.";
}
