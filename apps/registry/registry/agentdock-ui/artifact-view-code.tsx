"use client";
import { useState } from "react";
import { codeLanguage } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { Button } from "../ui/button.js";
export function ArtifactViewCode({ artifact }: ArtifactViewerProps) {
  const [wrap, setWrap] = useState(false);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground">
        <span>{codeLanguage(artifact.id) || "Source"}</span>
        <Button aria-pressed={wrap} onClick={() => setWrap(!wrap)}>
          Wrap lines
        </Button>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${artifact.title} source`}
        className={`overflow-auto p-3 font-mono text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${wrap ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre"}`}
      >
        <code>
          {(artifact.content ?? "").split("\n").map((line, i) => (
            <span key={i} className="block">
              <span
                aria-hidden="true"
                className="mr-4 inline-block min-w-7 select-none text-right text-muted-foreground"
              >
                {i + 1}
              </span>
              {line || "\u200b"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
