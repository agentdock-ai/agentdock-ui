"use client";
import { Download } from "lucide-react";
import { artifactBytes } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactDownload } from "./artifact-download.js";
import { artifactDownloadUrl } from "./artifact-url.js";
import { artifactIcon, artifactLabel } from "./artifact-icon.js";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ArtifactViewFile({ artifact }: ArtifactViewerProps) {
  const available =
    artifact.content !== undefined || Boolean(artifactDownloadUrl(artifact));
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
        <ChatIcon icon={artifactIcon(artifact)} size={22} />
      </span>
      <div>
        <h3 className="text-sm font-medium">{artifact.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {artifactLabel(artifact)}
          {artifact.content !== undefined &&
            ` · ${size(artifactBytes(artifact.content))}`}
        </p>
      </div>
      <p className="max-w-64 text-xs leading-5 text-muted-foreground">
        {available
          ? "This file can’t be previewed here. Download it to view it."
          : "This file has no downloadable content."}
      </p>
      <Button
        variant="outline"
        disabled={!available}
        onClick={() => artifactDownload(artifact)}
      >
        <ChatIcon icon={Download} size={14} />
        Download file
      </Button>
    </div>
  );
}
