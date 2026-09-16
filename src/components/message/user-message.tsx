import { Message } from "./message.js";
import type { MessageComponentProps } from "./types.js";

export type UserMessageProps = MessageComponentProps;

export function UserMessage({
  message,
  className,
  classNames,
  renderContentPart,
}: UserMessageProps) {
  const renderMessage = {
    id: message.messageId,
    role: "user" as const,
    content: message.content,
    state: "complete" as const,
  };
  return (
    <Message
      message={renderMessage}
      className={className}
      classNames={classNames}
      renderContentPart={renderContentPart}
    />
  );
}
