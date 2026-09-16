import type { ContentPart } from "@agentdock-ai/contracts";
import type { ReactNode } from "react";

export interface MessageContentProps {
  content: readonly ContentPart[];
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
  className?: string;
}

export function defaultRenderContentPart(
  part: ContentPart,
  index: number,
): ReactNode {
  if (part.type === "text") return <span key={index}>{part.text}</span>;
  if (part.type === "citation") {
    return <a key={index} href={part.url} target="_blank" rel="noreferrer">{part.title ?? part.url}</a>;
  }
  if (part.type === "image" && part.url) {
    return <img className="ad-message-image" key={index} src={part.url} alt="" />;
  }
  if (part.type === "file") {
    return <span className="ad-content-chip" key={index}>{part.name ?? "Attached file"}</span>;
  }
  if (part.type === "reasoning") {
    return <details className="ad-reasoning" key={index}><summary>Reasoning</summary>{part.text}</details>;
  }
  if (part.type === "tool-call") {
    return <span className="ad-content-chip" key={index}>Tool: {part.toolCall.name}</span>;
  }
  if (part.type === "tool-result") {
    return <span className="ad-content-chip" key={index}>Tool result</span>;
  }
  if (part.type === "custom") {
    return <span className="ad-content-chip" key={index}>{part.name}</span>;
  }
  return <span className="ad-content-chip" key={index}>{part.type} content</span>;
}

export function MessageContent({
  content,
  renderContentPart = defaultRenderContentPart,
  className,
}: MessageContentProps) {
  return (
    <div className={className} data-slot="message-content">
      {content.map((part, index) => renderContentPart(part, index))}
    </div>
  );
}
