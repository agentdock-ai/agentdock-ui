"use client";
import { useState } from "react";
import {
  AgentProvider,
  useAgentActions,
  useAgentState,
} from "@agentdock-ai/react";
import type { ChatProps } from "./types.js";
import { ChatShell } from "./chat-shell.js";
import { ChatViewport } from "./chat-viewport.js";
import { MessageList } from "./message-list.js";
import { EmptyState, Suggestions } from "./empty-state.js";
import { Composer } from "./composer.js";
import { ErrorState } from "./error-state.js";

export function Chat(props: ChatProps) {
  return (
    <AgentProvider store={props.store}>
      <ChatSurface {...props} />
    </AgentProvider>
  );
}
function ChatSurface({
  adapter,
  className,
  disabled,
  showReasoning = true,
  suggestions,
  welcomeTitle,
  welcomeDescription,
  placeholder,
}: ChatProps) {
  const { renderModel: model, agent, streamStatus } = useAgentState();
  const actions = useAgentActions(adapter);
  const [draft, setDraft] = useState("");
  const active =
    actions.busy ||
    (streamStatus === "consuming" &&
      !["completed", "failed", "cancelled"].includes(agent.status));
  const waiting = agent.status === "waiting" && streamStatus !== "stopped";
  const items = model.turns.at(-1)?.items ?? [];
  const activity = items.some(
    (item) =>
      item.type === "tool-call" ||
      item.type === "tool-timeline" ||
      item.type === "approval" ||
      (item.type === "message" &&
        item.role === "assistant" &&
        item.blocks.some((b) => b.type !== "reasoning" || showReasoning)),
  );
  const empty = model.turns.length === 0;
  const latestUserId = model.messages
    .filter((m) => m.role === "user")
    .at(-1)?.id;
  async function submit(text: string) {
    if (disabled || active || waiting || !text.trim()) return;
    setDraft("");
    const successful = await actions.sendMessage(text);
    if (!successful) setDraft((current) => current || text);
  }
  const status = actions.cancelling
    ? "Stopping…"
    : actions.respondingTo
      ? "Sending response…"
      : waiting
        ? "Waiting for your response"
        : active
          ? "Agent is working"
          : streamStatus === "error"
            ? "Connection interrupted"
            : streamStatus === "stopped"
              ? "Stream stopped"
              : agent.status === "completed"
                ? "Response complete"
                : agent.status === "failed"
                  ? "Run failed"
                  : agent.status === "cancelled"
                    ? "Run stopped"
                    : "";
  return (
    <ChatShell
      className={className}
      empty={empty}
      footer={
        <>
          {empty && (
            <EmptyState title={welcomeTitle} description={welcomeDescription} />
          )}
          <Composer
            key="composer"
            value={draft}
            onChange={setDraft}
            onSubmit={() => {
              void submit(draft);
            }}
            onStop={
              actions.canCancel && agent.runId
                ? () => {
                    void actions.cancelRun();
                  }
                : undefined
            }
            busy={active}
            waiting={waiting}
            cancelling={actions.cancelling}
            disabled={disabled}
            placeholder={placeholder}
          />
          {empty && suggestions && (
            <Suggestions
              suggestions={suggestions}
              disabled={disabled || active}
              onSubmit={(text) => {
                void submit(text);
              }}
            />
          )}
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {status}
          </span>
        </>
      }
    >
      <ChatViewport revision={model} latestUserId={latestUserId} empty={empty}>
        {!empty && (
          <MessageList
            model={model}
            thinking={active && !activity}
            showReasoning={showReasoning}
            canRespond={
              actions.canRespond &&
              !active &&
              !disabled &&
              streamStatus !== "stopped"
            }
            respondingTo={actions.respondingTo}
            approvalError={
              actions.actionError?.scope === "approval"
                ? actions.actionError.message
                : undefined
            }
            onRespond={(id, decisions) => {
              void actions.respondToInterrupt(id, decisions);
            }}
          />
        )}
        {model.transportError && actions.actionError?.scope !== "approval" && (
          <ErrorState {...model.transportError} />
        )}
        {actions.actionError?.scope === "cancel" && (
          <ErrorState
            title="Unable to stop"
            detail={actions.actionError.message}
          />
        )}
      </ChatViewport>
    </ChatShell>
  );
}
