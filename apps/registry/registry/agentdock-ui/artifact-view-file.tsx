"use client";
import { artifactBytes } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactDownload } from "./artifact-download.js";
import { Button } from "../ui/button.js";
export function ArtifactViewFile({ artifact }: ArtifactViewerProps) {
  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <h3 className="text-sm font-medium">{artifact.title}</h3>
      <p className="text-xs text-muted-foreground">
        {artifact.content !== undefined
          ? `${artifactBytes(artifact.content).toLocaleString()} bytes · `
          : ""}
        Download this file to view its contents.
      </p>
      <Button onClick={() => artifactDownload(artifact)}>Download file</Button>
    </div>
  );
}
