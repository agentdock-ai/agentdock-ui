import { useState, type CSSProperties, type ReactNode } from "react";
import type { ContentPart } from "@agentdock-ai/contracts";
import { useAgentStore } from "../../react/agent-provider.js";
import { useAgentState } from "../../react/use-agent-state.js";
import { Message } from "../message/message.js";
import { cn } from "../ui/class-names.js";
import { agentDockThemeStyle, type AgentDockThemeConfig } from "../ui/theme.js";
import { AgentChatComposer } from "./agent-chat-composer.js";
import { AgentChatHeader } from "./agent-chat-header.js";
import { AgentToolActivity } from "./agent-tool-activity.js";
import { AgentTypingIndicator } from "./agent-typing-indicator.js";
import type { AgentChatClassNames } from "./types.js";

export interface AgentChatViewProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  disabled?: boolean;
  showHeader?: boolean;
  className?: string;
  style?: CSSProperties;
  classNames?: AgentChatClassNames;
  theme?: AgentDockThemeConfig;
  onSubmit: (input: string) => void | Promise<void>;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}

function statusLabel(status: string, streamStatus: string): string {
  if (streamStatus === "error") return "Stream error";
  if (streamStatus === "consuming" && status === "idle") return "Connecting";
  if (status === "running") return "Responding";
  if (status === "waiting") return "Waiting for approval";
  if (status === "completed") return "Ready";
  if (status === "failed") return "Run failed";
  if (status === "cancelled") return "Cancelled";
  return "Ready";
}

export function AgentChatView({
  title = "AgentDock Assistant",
  subtitle = "Connected to the AgentDock event stream",
  placeholder = "Message your agent…",
  disabled = false,
  showHeader = true,
  className,
  style,
  classNames,
  theme,
  onSubmit,
  renderContentPart,
}: AgentChatViewProps) {
  const store = useAgentStore();
  const { agent, messages, runs, streamStatus, streamError } = useAgentState();
  const [input, setInput] = useState("");
  const busy = disabled || streamStatus === "consuming" || agent.status === "running" || agent.status === "waiting";

  async function submitMessage() {
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    store.setStreamStatus("consuming");
    try {
      await onSubmit(value);
    } catch (error) {
      store.setStreamStatus("error", error);
    }
  }

  const status = statusLabel(agent.status, streamStatus);
  return (
    <section
      className={cn("ad-chat", className, classNames?.root)}
      style={{ ...(theme ? agentDockThemeStyle(theme) : {}), ...style }}
      data-agentdock-theme={theme?.mode}
      aria-label="Agent chat"
    >
      {showHeader && (
        <AgentChatHeader
          title={title}
          subtitle={subtitle}
          status={status}
          busy={busy}
          error={streamStatus === "error"}
          className={classNames?.header}
          avatarClassName={classNames?.headerAvatar}
          contentClassName={classNames?.headerContent}
          titleClassName={classNames?.headerTitle}
          subtitleClassName={classNames?.headerSubtitle}
          statusClassName={classNames?.status}
        />
      )}
      <div className={cn("ad-chat-scroll", classNames?.scroll)} aria-live="polite">
        {messages.length === 0 ? (
          <div className={cn("ad-empty-state", classNames?.emptyState)} data-slot="empty-state">
            <div className={cn("ad-empty-icon", classNames?.emptyIcon)}>✳</div>
            <h2 className={classNames?.emptyTitle}>Try a real agent request</h2>
            <p className={classNames?.emptyDescription}>Ask a question or ask the agent to create and run a file in .sandbox.</p>
          </div>
        ) : (
          <div className={cn("ad-message-list", classNames?.messageList)}>
            {messages.map((message) => (
              <Message key={message.messageId} message={message} classNames={classNames?.message} renderContentPart={renderContentPart} />
            ))}
            {!disabled && busy && <AgentTypingIndicator className={classNames?.typing} />}
          </div>
        )}
        <AgentToolActivity runs={runs} classNames={{ root: classNames?.toolSection, label: classNames?.toolSectionLabel, card: classNames?.toolCard, top: classNames?.toolTop, icon: classNames?.toolIcon, info: classNames?.toolInfo, state: classNames?.toolState, detail: classNames?.toolDetail, progress: classNames?.toolProgress }} />
        {streamError != null && <div className={cn("ad-error", classNames?.error)} role="alert">{String(streamError)}</div>}
      </div>
      <AgentChatComposer
        value={input}
        disabled={disabled}
        busy={busy}
        placeholder={placeholder}
        className={classNames?.composer}
        inputClassName={classNames?.composerInput}
        footerClassName={classNames?.composerFooter}
        hintClassName={classNames?.composerHint}
        submitClassName={classNames?.composerSubmit}
        onChange={setInput}
        onSubmit={submitMessage}
      />
    </section>
  );
}
