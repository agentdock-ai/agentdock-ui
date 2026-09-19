import type { ContentPart, RenderMessage } from "@agentdock-ai/ui-core";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../ui/class-names.js";
import { MessageContent } from "./message-content.js";
import type { MessageClassNames } from "./types.js";

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

function toolInputSummary(input: NonNullable<RenderMessage["tool"]>["input"]): string {
  const values = Object.values(input)
    .filter((value) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .map(String);
  return values.join(" · ").slice(0, 96);
}

function toolProgressSummary(tool: NonNullable<RenderMessage["tool"]>): string {
  const text = tool.progress
    .filter((part): part is Extract<ContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
  return text.slice(-96);
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

  const summary = toolProgressSummary(tool) || toolInputSummary(tool.input);
  const statusLabel = toolStatusLabel(tool.status);

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
        <details
          className={cn("ad-tool-card", classNames?.toolCard)}
          open={tool.status === "failed"}
          data-tool-status={tool.status}
        >
          <summary className={cn("ad-tool-top ad-tool-summary", classNames?.toolTop)}>
            <span
              className={cn("ad-tool-icon", classNames?.toolIcon)}
              aria-hidden="true"
            >
              <Wrench />
            </span>
            <div className={cn("ad-tool-info", classNames?.toolInfo)}>
              <strong>{tool.name}</strong>
              <span>{summary || statusLabel}</span>
            </div>
            <span
              className={cn(
                "ad-tool-state",
                tool.status === "running" ? "is-running" : undefined,
                tool.status === "complete"
                  ? "is-done"
                  : tool.status === "failed"
                    ? "is-error"
                    : undefined,
                classNames?.toolState,
              )}
            >
              {statusLabel}
            </span>
          </summary>
          <div className={cn("ad-tool-detail", classNames?.toolDetail)}>
            <span className="ad-tool-detail-label">Parameters</span>
            <pre>{JSON.stringify(tool.input, null, 2)}</pre>
          </div>
          {tool.progress.length > 0 && (
            <MessageContent
              className={cn("ad-tool-progress", classNames?.toolProgress)}
              content={tool.progress}
              renderContentPart={renderContentPart}
            />
          )}
          {tool.output !== undefined && (
            <div className={cn("ad-tool-detail", classNames?.toolDetail)}>
              <span className="ad-tool-detail-label">Result</span>
              <pre>{JSON.stringify(tool.output, null, 2)}</pre>
            </div>
          )}
          {tool.error && (
            <div
              className={cn("ad-tool-detail", classNames?.toolDetail)}
            >
              <span className="ad-tool-detail-label">Error</span>
              <pre>{tool.error}</pre>
            </div>
          )}
        </details>
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
