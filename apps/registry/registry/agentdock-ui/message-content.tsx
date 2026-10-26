import { ChevronRight, ExternalLink, FileText, Link2 } from "lucide-react";
import { ChatIcon } from "./icon.js";
import type { RenderContentBlock } from "@agentdock-ai/ui-core";
import { TaggedContent } from "./tagged-content.js";
import { StreamingText } from "./streaming-text.js";
import { Reasoning } from "./reasoning.js";
import { ImageAttachment } from "./image-attachment.js";
import { safeUrl, formatJson } from "./utils.js";
export function MessageContent({
  blocks,
  showReasoning,
  charts = false,
}: {
  blocks: readonly RenderContentBlock[];
  showReasoning: boolean;
  charts?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {blocks.map((block) => {
        if (block.type === "text")
          return charts ? (
            <TaggedContent
              key={block.id}
              text={block.text}
              streaming={block.state === "streaming"}
            />
          ) : (
            <StreamingText
              key={block.id}
              text={block.text}
              active={block.state === "streaming"}
            />
          );
        if (block.type === "reasoning")
          return showReasoning ? (
            <Reasoning
              key={block.id}
              text={block.text}
              active={block.state === "streaming"}
            />
          ) : null;
        if (block.type === "custom")
          return (
            <details
              key={block.id}
              className="group/custom overflow-hidden rounded-xl border border-border text-[13px]"
            >
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                <ChatIcon
                  icon={ChevronRight}
                  size={13}
                  className="transition-transform duration-200 group-open/custom:rotate-90 motion-reduce:transition-none"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {block.name || "Additional content"}
                </span>
              </summary>
              <pre
                tabIndex={0}
                className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-border/70 bg-muted/40 px-3.5 py-3 font-mono text-[12px] leading-5 text-muted-foreground outline-none [overflow-wrap:anywhere]"
              >
                {formatJson(block.data)}
              </pre>
            </details>
          );
        const url = safeUrl(block.url);
        if (
          block.type === "image" &&
          url &&
          (/^https?:/i.test(url) || url.startsWith("/"))
        )
          return <ImageAttachment key={`${block.id}:${url}`} url={url} />;
        const label =
          block.type === "citation"
            ? block.title || "View source"
            : block.type === "file"
              ? block.name || "File"
              : `${block.type[0]?.toUpperCase()}${block.type.slice(1)}`;
        const kind =
          block.type === "citation"
            ? "Source"
            : block.type === "file"
              ? "File"
              : "Attachment";
        const card = (
          <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ChatIcon
                icon={block.type === "citation" ? Link2 : FileText}
                size={16}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-5 text-foreground">
                {label}
              </span>
              <span className="block text-[12px] leading-4 text-muted-foreground">
                {url ? kind : `${kind} · Preview unavailable`}
              </span>
            </span>
            {url && (
              <ChatIcon
                icon={ExternalLink}
                size={14}
                aria-hidden="true"
                className="mr-1 text-muted-foreground"
              />
            )}
          </>
        );
        const cardStyle =
          "flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-background p-1.5 pr-2.5 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]";
        return url ? (
          <a
            key={block.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${cardStyle} outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none`}
          >
            {card}
          </a>
        ) : (
          <div key={block.id} className={cardStyle}>
            {card}
          </div>
        );
      })}
    </div>
  );
}
