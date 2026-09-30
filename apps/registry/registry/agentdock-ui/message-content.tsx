import { FileText, ExternalLink } from "lucide-react";
import { ChatIcon } from "./icon.js";
import type { RenderContentBlock } from "@agentdock-ai/ui-core";
import { StreamingText } from "./streaming-text.js";
import { Reasoning } from "./reasoning.js";
import { safeUrl, formatJson } from "./utils.js";
export function MessageContent({
  blocks,
  showReasoning,
}: {
  blocks: readonly RenderContentBlock[];
  showReasoning: boolean;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {blocks.map((block) => {
        if (block.type === "text")
          return (
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
              className="rounded-lg border border-border text-sm"
            >
              <summary className="min-h-10 cursor-pointer px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {block.name || "Additional content"}
              </summary>
              <pre
                tabIndex={0}
                className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-border p-3 font-mono text-xs leading-6 [overflow-wrap:anywhere]"
              >
                {formatJson(block.data)}
              </pre>
            </details>
          );
        const url = safeUrl(block.url);
        if (block.type === "image" && url)
          return (
            <a
              key={block.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open attached image"
              className="block w-fit max-w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={url}
                alt="Attached image"
                loading="lazy"
                className="max-h-48 max-w-full rounded-lg border border-border object-contain"
              />
            </a>
          );
        const label =
          block.type === "citation"
            ? block.title || "View source"
            : block.type === "file"
              ? block.name || "File"
              : `${block.type[0]?.toUpperCase()}${block.type.slice(1)}`;
        return (
          <div
            key={block.id}
            className="flex max-w-full items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground"
          >
            <ChatIcon
              icon={FileText}
              size={16}
              aria-hidden="true"
              className="shrink-0"
            />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="[overflow-wrap:anywhere]">{label}</span>
                <ChatIcon
                  icon={ExternalLink}
                  size={13}
                  className="shrink-0"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span>{label} · Preview unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
