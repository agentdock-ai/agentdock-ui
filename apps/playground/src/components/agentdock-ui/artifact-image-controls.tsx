"use client";
import { Button } from "./ui/button";
export interface ArtifactImageControlsProps {
  fit: boolean;
  zoom: number;
  setFit: (value: boolean) => void;
  setZoom: (value: number) => void;
}
export function ArtifactImageControls(props: ArtifactImageControlsProps) {
  const { fit, zoom, setFit, setZoom } = props;
  const actual = () => {
    setFit(false);
    setZoom(1);
  };
  const fitImage = () => {
    setFit(true);
    setZoom(1);
  };
  const zoomBy = (step: number) => {
    setFit(false);
    setZoom(Math.min(4, Math.max(0.25, zoom + step)));
  };
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
      <Button aria-pressed={fit} onClick={fitImage}>
        Fit
      </Button>
      <Button aria-pressed={!fit && zoom === 1} onClick={actual}>
        Actual size
      </Button>
      <Button
        aria-label="Zoom out"
        disabled={zoom <= 0.25}
        onClick={() => zoomBy(-0.25)}
      >
        −
      </Button>
      <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
      <Button
        aria-label="Zoom in"
        disabled={zoom >= 4}
        onClick={() => zoomBy(0.25)}
      >
        +
      </Button>
    </div>
  );
}
