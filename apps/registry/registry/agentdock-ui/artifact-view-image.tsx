"use client";
import { useEffect, useState } from "react";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactMediaUrl } from "./artifact-url.js";
import { useArtifactUrl } from "./use-artifact-url.js";
import { ArtifactViewFile } from "./artifact-view-file.js";
import { ArtifactImageControls } from "./artifact-image-controls.js";
export function ArtifactViewImage({ artifact }: ArtifactViewerProps) {
  const [fit, setFit] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const blob = useArtifactUrl(
    artifact.content,
    artifact.mimeType ||
      (/\.svg$/i.test(artifact.id) ? "image/svg+xml" : "image/png"),
  );
  const url = blob ?? artifactMediaUrl(artifact.url, true);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return <ArtifactViewFile artifact={artifact} />;
  return (
    <div className="flex h-full min-h-80 flex-col">
      <ArtifactImageControls
        fit={fit}
        zoom={zoom}
        setFit={setFit}
        setZoom={setZoom}
      />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <img
          src={url}
          alt={artifact.title}
          onError={() => setFailed(true)}
          className={
            fit
              ? "mx-auto max-h-full max-w-full object-contain"
              : "max-w-none origin-top-left"
          }
          style={fit ? undefined : { transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  );
}
