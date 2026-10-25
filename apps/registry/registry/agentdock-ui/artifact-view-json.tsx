import { useMemo, useState } from "react";
import { parseArtifactJson } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { JsonTree } from "./json-tree.js";
import { ArtifactViewCode } from "./artifact-view-code.js";
import { InlineAlert } from "./alert.js";
export function ArtifactViewJson(props: ArtifactViewerProps) {
  const { artifact, mode } = props;
  const [raw, setRaw] = useState(false);
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
      artifact={{ ...artifact, content: JSON.stringify(parsed.value, null, 2) }}
    />
  ) : (
    <JsonTree
      key={artifact.content}
      value={parsed.value}
      onRaw={() => setRaw(true)}
    />
  );
}
