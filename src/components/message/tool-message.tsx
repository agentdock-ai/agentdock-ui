import { Bot } from "lucide-react";
import { MessageContent } from "./message-content.js";
import type { MessageComponentProps } from "./types.js";
import { cn } from "../ui/class-names.js";

export interface ToolMessageProps extends MessageComponentProps {
  label?: string;
}

export function ToolMessage({
  message,
  className,
  classNames,
  renderContentPart,
  label = "Tool",
}: ToolMessageProps) {
  return (
    <article className={cn("ad-message ad-message-tool", className, classNames?.root)} data-slot="tool-message">
      <div className={cn("ad-message-avatar", classNames?.avatar)} aria-hidden="true"><Bot /></div>
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
