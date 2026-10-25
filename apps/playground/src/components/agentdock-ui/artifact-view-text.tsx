import { useState, useMemo } from "react";
import { artifactTextMatches } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types";
export function ArtifactViewText({ artifact }: ArtifactViewerProps) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => artifactTextMatches(artifact.content ?? "", query),
    [artifact.content, query],
  );
  return (
    <div className="p-4">
      <input
        type="search"
        aria-label="Search in file"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search in file…"
        className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <pre className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
        {matches.map((part, i) =>
          part.match ? (
            <mark
              key={i}
              className="bg-amber-200 text-slate-950 dark:bg-amber-400"
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
