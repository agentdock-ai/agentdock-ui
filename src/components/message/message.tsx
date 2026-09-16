import type { ContentPart } from "@agentdock-ai/contracts";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../ui/class-names.js";
import { MessageContent } from "./message-content.js";
import type { MessageClassNames, RenderMessage } from "./types.js";

export interface MessageProps {
  message: RenderMessage;
  className?: string;
  classNames?: MessageClassNames;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}

function BasicMessage({
  message,
  className,
  classNames,
  renderContentPart,
}: MessageProps) {
  return (
    <article
      className={cn(
        "ad-message",
        message.role === "user"
          ? "ad-message-user"
          : message.role === "tool"
            ? "ad-message-tool"
            : "ad-message-assistant",
        message.state === "streaming" ? "ad-message-streaming" : undefined,
        className,
        classNames?.root,
      )}
      data-slot={`${message.role}-message`}
      data-message-state={message.state}
    >
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

function toolStatusLabel(
  status: NonNullable<RenderMessage["tool"]>["status"],
): string {
  if (status === "complete") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "approval") return "Needs approval";
  return "Running";
}

function ToolMessage({
  message,
  className,
  classNames,
  renderContentPart,
}: MessageProps) {
  const tool = message.tool;
  if (!tool) {
    return (
      <BasicMessage
        message={message}
        className={className}
        classNames={classNames}
        renderContentPart={renderContentPart}
      />
    );
  }

  return (
    <article
      className={cn(
        "ad-message ad-message-tool",
        message.state === "streaming" ? "ad-message-streaming" : undefined,
        className,
        classNames?.root,
      )}
      data-slot="tool-message"
      data-message-state={message.state}
      data-tool-status={tool.status}
    >
      <div className={cn("ad-message-body", classNames?.body)}>
        <div className={cn("ad-tool-card", classNames?.toolCard)}>
          <div className={cn("ad-tool-top", classNames?.toolTop)}>
            <span
              className={cn("ad-tool-icon", classNames?.toolIcon)}
              aria-hidden="true"
            >
              <Wrench />
            </span>
            <div className={cn("ad-tool-info", classNames?.toolInfo)}>
              <strong>{tool.name}</strong>
              <span>{toolStatusLabel(tool.status)}</span>
            </div>
            <span
              className={cn(
                "ad-tool-state",
                tool.status === "complete"
                  ? "is-done"
                  : tool.status === "failed"
                    ? "is-error"
                    : undefined,
                classNames?.toolState,
              )}
            >
              {toolStatusLabel(tool.status)}
            </span>
          </div>
          <details className={cn("ad-tool-detail", classNames?.toolDetail)}>
            <summary>Input</summary>
            <pre>{JSON.stringify(tool.input, null, 2)}</pre>
          </details>
          {tool.progress.length > 0 && (
            <MessageContent
              className={cn("ad-tool-progress", classNames?.toolProgress)}
              content={tool.progress}
              renderContentPart={renderContentPart}
            />
          )}
          {tool.output !== undefined && (
            <details className={cn("ad-tool-detail", classNames?.toolDetail)}>
              <summary>Result</summary>
              <pre>{JSON.stringify(tool.output, null, 2)}</pre>
            </details>
          )}
          {tool.error && (
            <details
              className={cn("ad-tool-detail", classNames?.toolDetail)}
              open
            >
              <summary>Error</summary>
              <pre>{tool.error}</pre>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}

export function Message({
  message,
  className,
  classNames,
  renderContentPart,
}: MessageProps) {
  if (message.role === "tool") {
    return (
      <ToolMessage
        message={message}
        className={className}
        classNames={classNames}
        renderContentPart={renderContentPart}
      />
    );
  }
  return (
    <BasicMessage
      message={message}
      className={className}
      classNames={classNames}
      renderContentPart={renderContentPart}
    />
  );
}
