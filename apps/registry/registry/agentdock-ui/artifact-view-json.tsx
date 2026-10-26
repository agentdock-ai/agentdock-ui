"use client";
import { useEffect, useMemo, useState } from "react";
import { formatArtifactJson, parseArtifactJson } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { JsonTree } from "./json-tree.js";
import { ArtifactViewCode } from "./artifact-view-code.js";
import { InlineAlert } from "./alert.js";
export function ArtifactViewJson(props: ArtifactViewerProps) {
  const { artifact, mode } = props;
  const [raw, setRaw] = useState(false);
  useEffect(() => setRaw(false), [mode, artifact.content]);
  const parsed = useMemo(
    () => parseArtifactJson(artifact.content ?? ""),
    [artifact.content],
  );
  if (!parsed.ok)
    return (
      <div className="p-3">
        <InlineAlert>{parsed.reason}</InlineAlert>
        <ArtifactViewCode {...props} />
      </div>
    );
  return mode === "raw" || raw ? (
    <ArtifactViewCode
      {...props}
      artifact={{
        ...artifact,
        content: formatArtifactJson(artifact.content ?? "", parsed.value),
      }}
    />
  ) : (
    <JsonTree
      key={artifact.content}
      value={parsed.value}
      onRaw={() =>
        props.onModeChange ? props.onModeChange("raw") : setRaw(true)
      }
    />
  );
}
