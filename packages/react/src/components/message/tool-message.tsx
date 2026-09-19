import { Message } from "./message.js";
import type { MessageComponentProps, RenderMessage } from "./types.js";

/** @deprecated Use Message with a normalized tool render message. */
export interface ToolMessageProps extends MessageComponentProps {
  label?: string;
}

/** Compatibility wrapper that routes legacy tool messages through Message. */
export function ToolMessage({
  message,
  className,
  classNames,
  renderContentPart,
  label = "Tool",
}: ToolMessageProps) {
  const callPart = message.content.find((part) => part.type === "tool-call");
  const resultPart = message.content.find((part) => part.type === "tool-result");
  const tool = callPart?.type === "tool-call"
    ? {
        toolCallId: callPart.toolCall.toolCallId,
        name: callPart.toolCall.name,
        input: callPart.toolCall.input,
        progress: message.content.filter(
          (part) => part.type !== "tool-call" && part.type !== "tool-result",
        ),
        ...(resultPart?.type === "tool-result"
          ? { output: resultPart.result.output }
          : {}),
        status:
          resultPart?.type === "tool-result"
            ? resultPart.result.isError
              ? ("failed" as const)
              : ("complete" as const)
            : ("running" as const),
      }
    : {
        toolCallId: `legacy-${message.messageId}`,
        name: label,
        input: {},
        progress: message.content,
        status: "complete" as const,
      };
  const renderMessage: RenderMessage = {
    id: message.messageId,
    role: "tool",
    content: [],
    state: "complete",
    tool,
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
