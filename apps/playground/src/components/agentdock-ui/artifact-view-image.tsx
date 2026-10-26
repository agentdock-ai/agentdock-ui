"use client";
import { useEffect, useState } from "react";
import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import type { ArtifactViewerProps } from "./artifact-types";
import { artifactMediaUrl } from "./artifact-url";
import { useArtifactUrl } from "./use-artifact-url";
import { ArtifactViewFile } from "./artifact-view-file";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

const control =
  "inline-flex h-7 items-center gap-1 rounded-md px-2 font-medium outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-muted aria-pressed:text-foreground";

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
  const zoomBy = (step: number) => {
    setFit(false);
    setZoom(Math.min(4, Math.max(0.25, zoom + step)));
  };
  return (
    <div className="flex h-full min-h-80 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          aria-pressed={fit}
          className={control}
          onClick={() => {
            setFit(true);
            setZoom(1);
          }}
        >
          <ChatIcon icon={Scan} size={13} />
          Fit
        </button>
        <button
          type="button"
          aria-pressed={!fit && zoom === 1}
          className={control}
          onClick={() => {
            setFit(false);
            setZoom(1);
          }}
        >
          Actual size
        </button>
        <span className="flex-1" />
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= 0.25}
          className={control}
          onClick={() => zoomBy(-0.25)}
        >
          <ChatIcon icon={ZoomOut} size={14} />
        </button>
        <span className="w-10 text-center tabular-nums">
          {fit ? "Fit" : `${Math.round(zoom * 100)}%`}
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= 4}
          className={control}
          onClick={() => zoomBy(0.25)}
        >
          <ChatIcon icon={ZoomIn} size={14} />
        </button>
      </div>
      <div
        // Checkerboard so transparent images stay visible in both themes.
        className="min-h-0 flex-1 overflow-auto bg-[conic-gradient(var(--color-muted)_25%,transparent_0_50%,var(--color-muted)_0_75%,transparent_0)] bg-[length:16px_16px] p-6"
      >
        <img
          src={url}
          alt={artifact.title}
          onError={() => setFailed(true)}
          className={cn(
            "shadow-[0_1px_3px_0_rgb(0_0_0/0.12)]",
            fit
              ? "mx-auto max-h-full max-w-full object-contain"
              : "max-w-none origin-top-left",
          )}
          style={fit ? undefined : { transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  );
}
