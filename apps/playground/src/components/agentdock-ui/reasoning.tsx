"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChatIcon } from "./icon";
import { ShimmerText } from "./shimmer-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
export function Reasoning({ text, active }: { text: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger className="group/reasoning flex min-h-7 max-w-full items-center gap-1 rounded-md text-[13px] leading-5 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:min-h-10">
        <ShimmerText active={active}>
          {active ? "Thinking" : "Thought process"}
        </ShimmerText>
        <ChatIcon
          icon={ChevronRight}
          size={13}
          aria-hidden="true"
          className={`transition-[transform,opacity] duration-200 motion-reduce:transition-none ${open ? "rotate-90 opacity-100" : "opacity-50 group-hover/reasoning:opacity-100"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          tabIndex={0}
          role="region"
          aria-label="Reasoning details"
          className="mb-1 ml-0.5 mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap border-l border-border pl-3.5 text-[13px] leading-6 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [overflow-wrap:anywhere]"
        >
          {text}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
