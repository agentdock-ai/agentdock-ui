"use client";
import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";
import { ChatIcon } from "./icon";
import type { RenderMessageItem } from "@agentdock-ai/ui-core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { MessageContent } from "./message-content";
import { safeDiagnosticText } from "./utils";

/** Canonical tool-role messages can exist without a structured tool-call record. */
export function ToolMessage({ message }: { message: RenderMessageItem }) {
  const [open, setOpen] = useState(false);
  const blocks = message.blocks.map((block) =>
    block.type === "text"
      ? { ...block, text: safeDiagnosticText(block.text) }
      : block,
  );
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0 px-1">
      <CollapsibleTrigger className="group/output flex min-h-7 items-center gap-2 rounded-md text-left text-[13px] leading-5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-10">
        <ChatIcon
          icon={Terminal}
          aria-hidden="true"
          size={13}
          className="opacity-60"
        />
        <span>Tool output</span>
        <ChatIcon
          icon={ChevronRight}
          aria-hidden="true"
          size={13}
          className={`-ml-1 transition-[transform,opacity] duration-200 motion-reduce:transition-none ${open ? "rotate-90 opacity-100" : "opacity-50 group-hover/output:opacity-100"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mb-2 ml-[1.3125rem] mt-1 max-h-64 overflow-auto rounded-lg bg-muted/60 px-3 py-2 text-foreground/80 [&_*]:text-[13px] [&_*]:leading-5">
          <MessageContent blocks={blocks} showReasoning={false} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
