"use client";
import type { ReactNode } from "react";
import { useArtifacts } from "./artifact-context.js";
import { useArtifactSplit } from "./use-artifact-split.js";
import { ArtifactPanel } from "./artifact-panel.js";
export function ChatSplit({
  children,
  panel = <ArtifactPanel />,
}: {
  children: ReactNode;
  panel?: ReactNode;
}) {
  const context = useArtifacts();
  const { width, divider } = useArtifactSplit();
  if (!context) return children;
  return (
    <div className="flex h-full min-h-0 w-full min-w-0">
      <div className="min-w-0 flex-1">{children}</div>
      {context.visible && (
        <>
          <div
            role="separator"
            aria-label="Resize artifact panel"
            aria-orientation="vertical"
            aria-valuenow={width}
            aria-valuemin={25}
            aria-valuemax={75}
            tabIndex={0}
            {...divider}
            className="hidden w-1 shrink-0 cursor-col-resize touch-none bg-border outline-none hover:bg-ring focus-visible:bg-ring md:block"
          />
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
