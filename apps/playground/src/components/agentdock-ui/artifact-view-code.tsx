"use client";
import { useState } from "react";
import { WrapText } from "lucide-react";
import { codeLanguage } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

export function ArtifactViewCode({ artifact }: ArtifactViewerProps) {
  const [wrap, setWrap] = useState(false);
  const lines = (artifact.content ?? "").split("\n");
  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <span className="font-mono">
          {codeLanguage(artifact.id) ?? "source"} · {lines.length} lines
        </span>
        <button
          type="button"
          aria-pressed={wrap}
          onClick={() => setWrap(!wrap)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-pressed:bg-muted aria-pressed:text-foreground"
        >
          <ChatIcon icon={WrapText} size={13} />
          Wrap lines
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${artifact.title} source`}
        className={cn(
          "overflow-auto py-3 font-mono text-[12.5px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          wrap
            ? "whitespace-pre-wrap [overflow-wrap:anywhere]"
            : "whitespace-pre",
        )}
      >
        <code>
          {lines.map((line, i) => (
            <span key={i} className="flex hover:bg-muted/40">
              <span
                aria-hidden="true"
                className="sticky left-0 w-12 shrink-0 select-none bg-background pr-4 text-right text-muted-foreground/70"
              >
                {i + 1}
              </span>
              <span className="min-w-0 pr-4">{line || "​"}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
