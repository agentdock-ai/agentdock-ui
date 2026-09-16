import { Message } from "./message.js";
import type { MessageComponentProps } from "./types.js";
import type { RenderMessage } from "./types.js";

export type AssistantMessageProps = MessageComponentProps;

export function AssistantMessage({
  message,
  className,
  classNames,
  renderContentPart,
}: AssistantMessageProps) {
  const renderMessage: RenderMessage = {
    id: message.messageId,
    role: "assistant",
    content: message.content,
    state: "complete",
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
