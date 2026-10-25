"use client";
import { artifactBytes } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types";
import { artifactDownload } from "./artifact-download";
import { artifactDownloadUrl } from "./artifact-url";
import { Button } from "./ui/button";
export function ArtifactViewFile({ artifact }: ArtifactViewerProps) {
  const available =
    artifact.content !== undefined || Boolean(artifactDownloadUrl(artifact));
  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <h3 className="text-sm font-medium">{artifact.title}</h3>
      <p className="text-xs text-muted-foreground">
        {artifact.content !== undefined
          ? `${artifactBytes(artifact.content).toLocaleString()} bytes · `
          : ""}
        {available
          ? "Download this file to view its contents."
          : "This file has no downloadable content."}
      </p>
      <Button disabled={!available} onClick={() => artifactDownload(artifact)}>
        Download file
      </Button>
    </div>
  );
}
