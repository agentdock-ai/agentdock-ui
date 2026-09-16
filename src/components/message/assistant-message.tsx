import { MessageContent } from "./message-content.js";
import type { MessageComponentProps } from "./types.js";
import { cn } from "../ui/class-names.js";

export interface AssistantMessageProps extends MessageComponentProps {
  label?: string;
}

export function AssistantMessage({
  message,
  className,
  classNames,
  renderContentPart,
  label = "Agent",
}: AssistantMessageProps) {
  return (
    <article className={cn("ad-message ad-message-assistant", className, classNames?.root)} data-slot="assistant-message">
      <div className={cn("ad-message-avatar", classNames?.avatar)} aria-hidden="true">A</div>
      <div className={cn("ad-message-body", classNames?.body)}>
        <div className={cn("ad-message-label", classNames?.label)}>{label}</div>
        <MessageContent
          className={cn("ad-message-content", classNames?.content)}
          content={message.content}
          renderContentPart={renderContentPart}
        />
      </div>
    </article>
  );
}
