"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { ShimmerText } from "./shimmer-text.js";
import type { RenderToolCallItem } from "@agentdock-ai/ui-core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.js";
import { ToolCall } from "./tool-call.js";
export function ToolTimeline({
  tools,
}: {
  tools: readonly RenderToolCallItem[];
}) {
  const [expanded, setExpanded] = useState<boolean | undefined>();
  const active = tools.some((item) => item.active);
  const open = expanded ?? false;
  const failures = tools.filter((item) => item.tool.status === "failed").length;
  if (tools.length === 1)
    return (
      <div className="px-1">
        <ToolCall item={tools[0]!} />
      </div>
    );
  return (
    <Collapsible
      open={open}
      onOpenChange={setExpanded}
      className="min-w-0 px-1"
    >
      <CollapsibleTrigger className="group/tools flex min-h-7 items-center gap-1 rounded-md text-[13px] leading-5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-10">
        <ShimmerText
          active={active}
          className="inline-block first-letter:uppercase"
        >
          {active ? "running" : "ran"} {tools.length} tools
        </ShimmerText>
        {failures > 0 && (
          <span className="ml-0.5 text-destructive">· {failures} failed</span>
        )}
        <ChatIcon
          icon={ChevronRight}
          size={13}
          aria-hidden="true"
          className={`transition-[transform,opacity] duration-200 motion-reduce:transition-none ${open ? "rotate-90 opacity-100" : "opacity-50 group-hover/tools:opacity-100"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mb-1 ml-0.5 mt-0.5 border-l border-border pl-3.5">
          {tools.map((item) => (
            <ToolCall key={item.tool.toolCallId} item={item} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
