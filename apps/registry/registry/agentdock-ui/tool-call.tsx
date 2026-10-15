"use client";
import { useState } from "react";
import { ChevronRight, CircleAlert, Wrench } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { ShimmerText } from "./shimmer-text.js";
import type { RenderToolCallItem } from "@agentdock-ai/ui-core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.js";
import { ErrorState } from "./error-state.js";
import { formatJson } from "./utils.js";

export function ToolCall({ item }: { item: RenderToolCallItem }) {
  const [open, setOpen] = useState(false);
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

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger
        aria-label={`${tool.name} ${status}`}
        className="group/tool flex min-h-7 max-w-full min-w-0 items-center gap-2 rounded-md text-left text-[13px] leading-5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-10"
      >
        <ChatIcon
          icon={failed ? CircleAlert : Wrench}
          size={13}
          aria-hidden="true"
          className={failed ? "text-destructive" : "opacity-60"}
        />
        <ShimmerText
          active={running}
          className="min-w-0 truncate font-mono text-[12.5px]"
        >
          {tool.name}
        </ShimmerText>
        {status !== "Complete" && status !== "Running" && (
          <span
            className={`shrink-0 text-[12px] ${failed ? "text-destructive" : ""}`}
          >
            {status}
          </span>
        )}
        <ChatIcon
          icon={ChevronRight}
          size={13}
          aria-hidden="true"
          className={`shrink-0 transition-[transform,opacity] duration-200 motion-reduce:transition-none ${open ? "rotate-90 opacity-100" : "opacity-0 group-hover/tool:opacity-100 group-focus-visible/tool:opacity-100 [@media(hover:none)]:opacity-50"}`}
        />
      </CollapsibleTrigger>
      {progress && (
        <p
          role="status"
          className="mb-1 ml-[1.3125rem] line-clamp-2 text-[12px] leading-5 text-muted-foreground [overflow-wrap:anywhere]"
        >
          {progress}
        </p>
      )}
      <CollapsibleContent>
        <div className="mb-2 ml-[1.3125rem] mt-1 space-y-2.5">
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
            <ErrorState
              title="Tool failed"
              detail={
                tool.error ??
                (typeof tool.output === "string"
                  ? tool.output
                  : "The tool returned an error.")
              }
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
        className="max-h-60 max-w-full overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 font-mono text-[12px] leading-5 text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [overflow-wrap:anywhere]"
      >
        {formatJson(value)}
      </pre>
    </div>
  );
}
