"use client";
import { ChevronRight } from "lucide-react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { useArtifacts } from "./artifact-context.js";
import { artifactIcon, artifactLabel } from "./artifact-icon.js";
import { ChatIcon } from "./icon.js";
import { cn } from "./utils.js";

/** Inline cards for the files a tool call produced; click to open the panel. */
export function ArtifactCards({ toolCallId }: { toolCallId: string }) {
  const context = useArtifacts();
  const artifacts = context?.artifacts.filter((a) =>
    a.versions.some((v) => v.toolCallId === toolCallId),
  );
  if (!context || !artifacts?.length) return null;
  return (
    <div className="mt-1.5 flex min-w-0 flex-col gap-1.5">
      {artifacts.map((artifact) => {
        const total = artifact.versions.length;
        const version =
          artifact.versions.find((v) => v.toolCallId === toolCallId)?.version ??
          total;
        const shown = context.chosen[artifact.id] ?? total;
        return (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            version={version}
            active={
              context.visible &&
              context.activeId === artifact.id &&
              shown === version
            }
            // Open the version this tool call wrote, not always the latest.
            onOpen={() => {
              context.selectVersion(
                artifact.id,
                version === total ? undefined : version,
              );
              context.open(artifact.id);
            }}
          />
        );
      })}
    </div>
  );
}

export function ArtifactCard({
  artifact,
  version,
  active,
  onOpen,
}: {
  artifact: Artifact;
  version: number;
  active: boolean;
  onOpen: () => void;
}) {
  const total = artifact.versions.length;
  return (
    <button
      type="button"
      aria-label={`Open ${artifact.title}`}
      aria-current={active || undefined}
      onClick={onOpen}
      className={cn(
        "group/card flex w-full max-w-sm min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none",
        active ? "border-foreground/25" : "border-border",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <ChatIcon icon={artifactIcon(artifact)} size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium leading-5 text-foreground">
          {artifact.title}
        </span>
        <span className="truncate text-xs leading-4 text-muted-foreground">
          {artifactLabel(artifact)}
          {total > 1 &&
            ` · v${version}${version === total ? "" : ` of ${total}`}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors group-hover/card:text-foreground">
        {active ? "Viewing" : "Open"}
        <ChatIcon icon={ChevronRight} size={13} />
      </span>
    </button>
  );
}
