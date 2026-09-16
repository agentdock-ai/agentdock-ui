import { MessageContent } from "./message-content.js";
import type { MessageComponentProps } from "./types.js";
import { cn } from "../ui/class-names.js";

export function UserMessage({ message, className, classNames, renderContentPart }: MessageComponentProps) {
  return (
    <article className={cn("ad-message ad-message-user", className, classNames?.root)} data-slot="user-message">
      <div className={cn("ad-message-body", classNames?.body)}>
        <MessageContent
          className={cn("ad-message-content", classNames?.content)}
          content={message.content}
          renderContentPart={renderContentPart}
        />
      </div>
    </article>
  );
}
