"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { artifactTextMatches } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types";
import { ChatIcon } from "./icon";

export function ArtifactViewText({ artifact }: ArtifactViewerProps) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => artifactTextMatches(artifact.content ?? "", query),
    [artifact.content, query],
  );
  const count = query ? matches.filter((part) => part.match).length : 0;
  return (
    <div className="min-w-0">
      <label className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <ChatIcon icon={Search} size={13} />
        <input
          type="search"
          aria-label="Search in file"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in file…"
          className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <span className="tabular-nums" aria-live="polite">
            {count} {count === 1 ? "match" : "matches"}
          </span>
        )}
      </label>
      <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[12.5px] leading-5 [overflow-wrap:anywhere]">
        {matches.map((part, i) =>
          part.match ? (
            <mark
              key={i}
              className="rounded-sm bg-amber-200 text-slate-950 dark:bg-amber-400"
            >
              {part.text}
            </mark>
          ) : (
            part.text
          ),
        )}
      </pre>
    </div>
  );
}
