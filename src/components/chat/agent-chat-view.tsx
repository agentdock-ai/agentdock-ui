import { useState, type CSSProperties, type ReactNode } from "react";
import type { ContentPart } from "@agentdock-ai/contracts";
import { useAgentStore } from "../../react/agent-provider.js";
import { useAgentState } from "../../react/use-agent-state.js";
import { Message } from "../message/message.js";
import { selectRenderMessages } from "../message/select-render-messages.js";
import { cn } from "../ui/class-names.js";
import { agentDockThemeStyle, type AgentDockThemeConfig } from "../ui/theme.js";
import { AgentChatComposer } from "./agent-chat-composer.js";
import { AgentTypingIndicator } from "./agent-typing-indicator.js";
import type { AgentChatClassNames } from "./types.js";

export interface AgentChatViewProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  classNames?: AgentChatClassNames;
  theme?: AgentDockThemeConfig;
  onSubmit: (input: string) => void | Promise<void>;
  onInterrupt?: () => void | Promise<void>;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}

export function AgentChatView({
  placeholder = "Message your agent…",
  disabled = false,
  className,
  style,
  classNames,
  theme,
  onSubmit,
  onInterrupt,
  renderContentPart,
}: AgentChatViewProps) {
  const store = useAgentStore();
  const { agent, runs, events, streamStatus, streamError } = useAgentState();
  const [input, setInput] = useState("");
  const messages = selectRenderMessages({ runs, events });
  const busy = disabled || streamStatus === "consuming" || agent.status === "running" || agent.status === "waiting";

  async function submitMessage() {
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    store.appendUserMessage(value);
    store.setStreamStatus("consuming");
    try {
      await onSubmit(value);
    } catch (error) {
      store.setStreamStatus("error", error);
    }
  }

  async function interruptMessage() {
    if (disabled || !onInterrupt) return;
    try {
      await onInterrupt();
    } catch (error) {
      store.setStreamStatus("error", error);
    }
  }

  return (
    <section
      className={cn("ad-chat", className, classNames?.root)}
      style={{ ...(theme ? agentDockThemeStyle(theme) : {}), ...style }}
      data-agentdock-theme={theme?.mode}
      aria-label="Agent chat"
    >
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
              <Message key={message.id} message={message} classNames={classNames?.message} renderContentPart={renderContentPart} />
            ))}
            {!disabled && busy && <AgentTypingIndicator className={classNames?.typing} />}
          </div>
        )}
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
        submitClassName={classNames?.composerSubmit}
        onChange={setInput}
        onSubmit={submitMessage}
        onInterrupt={interruptMessage}
      />
    </section>
  );
}
