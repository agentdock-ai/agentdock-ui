"use client";
import { useState } from "react";
import { Check, ChevronRight, LoaderCircle, Square, X } from "lucide-react";
import { ChatIcon } from "./icon";
import type { RenderToolCallItem } from "@agentdock-ai/ui-core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { PulseDot, toneText } from "./alert";
import { formatElapsed } from "./thinking-indicator";
import { cn, errorDetail, formatJson } from "./utils";

export function ToolCall({ item }: { item: RenderToolCallItem }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { tool, active } = item;
  const failed = tool.status === "failed";
  const running = active && tool.status === "running";
  const status = failed
    ? "Failed"
    : tool.status === "approval"
      ? "Needs approval"
      : running
        ? "Running"
        : tool.status === "complete"
          ? "Complete"
          : "Stopped";
  const progress = running
    ? tool.progress
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .at(-1)
    : undefined;
  const started = tool.startedAt ? Date.parse(tool.startedAt) : NaN;
  const completed = tool.completedAt ? Date.parse(tool.completedAt) : NaN;
  const duration =
    Number.isFinite(started) && Number.isFinite(completed)
      ? formatDuration(completed - started)
      : undefined;
  const message = failed
    ? errorDetail(
        tool.error ??
          (typeof tool.output === "string"
            ? tool.output
            : "The tool returned an error."),
      )
    : undefined;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger
        aria-label={`${tool.name} ${status}`}
        className="group/tool flex min-h-7 w-full max-w-full min-w-0 items-center gap-2 rounded-md text-left text-[13px] leading-5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-10"
      >
        <span className="flex w-3.5 shrink-0 justify-center">
          {running ? (
            <ChatIcon
              icon={LoaderCircle}
              size={13}
              className="text-foreground motion-safe:animate-spin"
            />
          ) : tool.status === "approval" ? (
            <PulseDot />
          ) : (
            <ChatIcon
              icon={failed ? X : tool.status === "complete" ? Check : Square}
              size={13}
              className={
                failed
                  ? toneText.error
                  : tool.status === "complete"
                    ? toneText.success
                    : undefined
              }
            />
          )}
        </span>
        <span className="min-w-0 truncate font-mono text-[12.5px] text-foreground/90">
          {tool.name}
        </span>
        {status !== "Complete" && (
          <span
            className={cn(
              "shrink-0 text-[12px]",
              failed && cn("font-medium", toneText.error),
              tool.status === "approval" && cn("font-medium", toneText.warning),
            )}
          >
            {status}
          </span>
        )}
        {duration && (
          <span className="shrink-0 font-mono text-[12px] tabular-nums">
            {duration}
          </span>
        )}
        <ChatIcon
          icon={ChevronRight}
          size={13}
          aria-hidden="true"
          className={`ml-auto shrink-0 transition-[transform,opacity] duration-200 motion-reduce:transition-none ${open ? "rotate-90 opacity-100" : "opacity-0 group-hover/tool:opacity-100 group-focus-visible/tool:opacity-100 [@media(hover:none)]:opacity-50"}`}
        />
      </CollapsibleTrigger>
      {progress && (
        <p
          role="status"
          className="mb-1 ml-[1.375rem] line-clamp-2 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]"
        >
          {progress}
        </p>
      )}
      {failed && !open && (
        <p className="mb-1 ml-[1.375rem] line-clamp-1 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
          {message}
        </p>
      )}
      <CollapsibleContent>
        <div className="mb-2 ml-[1.375rem] mt-1 space-y-2.5">
          <Payload title="Input" value={tool.input} />
          {tool.progress.length > 0 && (
            <Payload
              title="Progress"
              value={tool.progress
                .map((part) => ("text" in part ? part.text : formatJson(part)))
                .join("\n")}
            />
          )}
          {tool.output !== undefined && !failed && (
            <Payload title="Output" value={tool.output} />
          )}
          {failed && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5">
              <p
                role="alert"
                className="min-w-0 flex-1 [overflow-wrap:anywhere]"
              >
                <span className={cn("font-medium", toneText.error)}>
                  {message}
                </span>{" "}
                {tool.errorCode && (
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {tool.errorCode}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(
                      [tool.errorCode, message].filter(Boolean).join(": "),
                    )
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
                className="shrink-0 rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {copied ? "Copied" : "Copy error"}
              </button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : formatElapsed(ms);
}

function Payload({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[12px] leading-4 text-muted-foreground">
        {title}
      </p>
      <pre
        tabIndex={0}
        aria-label={title}
        className="max-h-60 max-w-full overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-[12px] leading-5 text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [overflow-wrap:anywhere]"
      >
        {formatJson(value)}
      </pre>
    </div>
  );
}
