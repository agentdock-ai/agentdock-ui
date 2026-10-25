import { useEffect, useState } from "react";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactMediaUrl } from "./artifact-url.js";
import { useArtifactUrl } from "./use-artifact-url.js";
import { ArtifactViewFile } from "./artifact-view-file.js";
import { Button } from "../ui/button.js";
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
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <Button
          aria-pressed={fit}
          onClick={() => {
            setFit(true);
            setZoom(1);
          }}
        >
          Fit
        </Button>
        <Button
          aria-pressed={!fit && zoom === 1}
          onClick={() => {
            setFit(false);
            setZoom(1);
          }}
        >
          Actual size
        </Button>
        <Button
          aria-label="Zoom out"
          disabled={zoom <= 0.25}
          onClick={() => {
            setFit(false);
            setZoom(Math.max(0.25, zoom - 0.25));
          }}
        >
          −
        </Button>
        <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button
          aria-label="Zoom in"
          disabled={zoom >= 4}
          onClick={() => {
            setFit(false);
            setZoom(Math.min(4, zoom + 0.25));
          }}
        >
          +
        </Button>
      </div>
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
