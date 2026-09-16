import type { ContentPart } from "@agentdock-ai/contracts";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MessageContentProps {
  content: readonly ContentPart[];
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
  className?: string;
}

const markdownComponents: Components = {
  a({ children, ...props }) {
    return (
      <a {...props} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
};

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="ad-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function renderDefaultContent(content: readonly ContentPart[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let text = "";
  let textStartIndex = 0;

  const flushText = () => {
    if (!text) return;
    nodes.push(<MarkdownText key={`text-${textStartIndex}`} text={text} />);
    text = "";
  };

  content.forEach((part, index) => {
    if (part.type === "text") {
      if (!text) textStartIndex = index;
      text += part.text;
      return;
    }
    flushText();
    nodes.push(defaultRenderContentPart(part, index));
  });

  flushText();
  return nodes;
}

export function defaultRenderContentPart(
  part: ContentPart,
  index: number,
): ReactNode {
  if (part.type === "text") return <MarkdownText key={index} text={part.text} />;
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
  renderContentPart,
  className,
}: MessageContentProps) {
  return (
    <div className={className} data-slot="message-content">
      {renderContentPart
        ? content.map((part, index) => renderContentPart(part, index))
        : renderDefaultContent(content)}
    </div>
  );
}
