"use client";
import type { ReactNode } from "react";
import { useArtifacts } from "./artifact-context.js";
import { useArtifactSplit } from "./use-artifact-split.js";
import { ArtifactPanel } from "./artifact-panel.js";
import { cn } from "./utils.js";

export function ChatSplit({
  children,
  panel = <ArtifactPanel />,
}: {
  children: ReactNode;
  panel?: ReactNode;
}) {
  const context = useArtifacts();
  const { containerRef, width, minimum, maximum, dragging, divider } =
    useArtifactSplit();
  if (!context) return children;
  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full min-h-0 w-full min-w-0",
        dragging &&
          "select-none cursor-col-resize [&_iframe]:pointer-events-none",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {context.visible && (
        <>
          <div
            role="separator"
            aria-label="Resize artifact panel"
            aria-orientation="vertical"
            aria-valuenow={Math.round(width)}
            aria-valuemin={Math.round(minimum)}
            aria-valuemax={Math.round(maximum)}
            aria-valuetext={`${Math.round(width)}% artifact width`}
            title="Drag to resize · Double-click to reset"
            tabIndex={0}
            {...divider}
            // Keep the visual divider small and its pointer target easy to grab.
            className="group/divider relative z-10 -mx-1.5 hidden w-3 shrink-0 cursor-col-resize touch-none outline-none md:block"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors",
                "group-hover/divider:w-0.5 group-hover/divider:bg-ring group-focus-visible/divider:w-0.5 group-focus-visible/divider:bg-ring",
                dragging && "w-0.5 bg-ring",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 transition-colors group-hover/divider:bg-ring group-focus-visible/divider:bg-ring motion-reduce:transition-none",
                dragging && "bg-ring",
              )}
            />
          </div>
          <div
            style={{ flexBasis: `${width}%` }}
            className="min-h-0 min-w-0 md:shrink-0"
          >
            {panel}
          </div>
        </>
      )}
    </div>
  );
}
