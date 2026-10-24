import type { JsonValue, RenderModel } from "@agentdock-ai/ui-core";
import { Message } from "./message.js";
import { ToolTimeline } from "./tool-timeline.js";
import { ApprovalCard, type ToolRisk } from "./approval-card.js";
import { InterruptCard } from "./interrupt-card.js";
import { ThinkingIndicator } from "./thinking-indicator.js";
import { ErrorState } from "./error-state.js";
import { TurnStatus } from "./run-status-banner.js";
export function MessageList({
  model,
  thinking = false,
  showReasoning,
  canRespond,
  respondingTo,
  approvalError,
  approvalErrorCode,
  onRespond,
  onAnswer,
  onStop,
  toolRisk,
  approvalTtlMs,
}: {
  model: RenderModel;
  thinking?: boolean;
  showReasoning: boolean;
  canRespond: boolean;
  respondingTo: string | null;
  approvalError?: string;
  approvalErrorCode?: string;
  onRespond: (interruptId: string, decisions: readonly JsonValue[]) => void;
  /** Answers custom interrupts; without it they render read-only. */
  onAnswer?: (interruptId: string, value: JsonValue) => void;
  /** Offered by the thinking indicator when a step runs long. */
  onStop?: () => void;
  toolRisk?: (toolName: string) => ToolRisk | undefined;
  /** Matches the server’s `approvalTtlMs`; approvals then count down and expire. */
  approvalTtlMs?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      {model.turns.map((turn) => (
        <div
          key={
            turn.items.find(
              (item) => item.type === "message" && item.role === "user",
            )?.id ?? turn.id
          }
          className="flex min-w-0 flex-col gap-4"
          data-turn={turn.id}
        >
          {turn.items.map((item) => {
            switch (item.type) {
              case "message":
                return (
                  <Message
                    key={item.id}
                    message={item}
                    showReasoning={showReasoning}
                    showActions={
                      turn.items
                        .filter(
                          (i) => i.type === "message" && i.role === "assistant",
                        )
                        .at(-1)?.id === item.id
                    }
                  />
                );
              case "tool-call":
                return <ToolTimeline key={item.id} tools={[item]} />;
              case "tool-timeline":
                return <ToolTimeline key={item.id} tools={item.tools} />;
              case "approval": {
                const requested = item.approval.requestedAt
                  ? Date.parse(item.approval.requestedAt)
                  : NaN;
                const pending = respondingTo === item.approval.interruptId;
                return item.approval.kind === "custom" ? (
                  <InterruptCard
                    key={item.id}
                    approval={item.approval}
                    enabled={Boolean(onAnswer) && turn.state === "waiting"}
                    error={approvalError}
                    errorCode={approvalErrorCode}
                    pending={pending}
                    onAnswer={
                      onAnswer &&
                      ((value) => onAnswer(item.approval.interruptId, value))
                    }
                  />
                ) : (
                  <ApprovalCard
                    key={item.id}
                    approval={item.approval}
                    enabled={canRespond && turn.state === "waiting"}
                    error={approvalError}
                    errorCode={approvalErrorCode}
                    pending={pending}
                    riskOf={toolRisk}
                    expiresAt={
                      approvalTtlMs !== undefined && Number.isFinite(requested)
                        ? requested + approvalTtlMs
                        : undefined
                    }
                    onRespond={(decisions) =>
                      onRespond(item.approval.interruptId, decisions)
                    }
                  />
                );
              }
              case "error":
                return <ErrorState key={item.id} {...item.error} />;
            }
          })}
          {thinking && turn === model.turns.at(-1) && (
            <ThinkingIndicator
              startedAt={turn.startedAt}
              onStop={onStop}
              label={
                turn.items.some(
                  (item) =>
                    item.type === "message" &&
                    item.role === "assistant" &&
                    item.blocks.some(
                      (block) => block.type === "text" && block.text.trim(),
                    ),
                )
                  ? "working"
                  : "thinking"
              }
            />
          )}
          {(turn.state === "stopped" || turn.transportState === "stopped") && (
            <TurnStatus state="stopped">
              Stopped · your partial answer is kept
            </TurnStatus>
          )}
        </div>
      ))}
    </div>
  );
}
