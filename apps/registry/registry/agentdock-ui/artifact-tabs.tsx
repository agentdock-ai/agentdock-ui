"use client";
import { useId, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { ChatIcon } from "./icon.js";
import { useArtifacts } from "./artifact-context.js";
import { artifactIcon } from "./artifact-icon.js";
import { cn } from "./utils.js";

type ArtifactState = NonNullable<ReturnType<typeof useArtifacts>>;

const moves: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i + n - 1) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

function onTabKey(
  event: KeyboardEvent<HTMLButtonElement>,
  context: ArtifactState,
  index: number,
) {
  if (event.key === "Delete") {
    context.close(context.tabs[index]!);
    return;
  }
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  const next = move(index, context.tabs.length);
  context.open(context.tabs[next]!);
  event.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [next]?.focus();
}

export function ArtifactTabs() {
  const context = useArtifacts();
  const prefix = useId();
  if (!context) return null;
  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-border bg-muted/30 px-1.5 pt-1"
    >
      {context.tabs.map((id, index) => {
        const artifact = context.artifacts.find((a) => a.id === id);
        return (
          artifact && (
            <ArtifactTab
              key={id}
              id={`${prefix}-${index}`}
              artifact={artifact}
              context={context}
              index={index}
            />
          )
        );
      })}
    </div>
  );
}

function ArtifactTab({
  id,
  artifact,
  context,
  index,
}: {
  id: string;
  artifact: Artifact;
  context: ArtifactState;
  index: number;
}) {
  const active = artifact.id === context.activeId;
  const updated =
    !active && artifact.versions.length > (context.seen[artifact.id] ?? 0);
  return (
    <div
      className={cn(
        "group/tab -mb-px flex max-w-40 shrink-0 items-center rounded-t-lg border border-b-0 text-xs",
        active
          ? "border-border bg-card text-foreground"
          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <button
        type="button"
        role="tab"
        id={id}
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        onClick={() => context.open(artifact.id)}
        onKeyDown={(event) => onTabKey(event, context, index)}
        className="flex min-h-7 min-w-0 items-center gap-1.5 rounded-t-lg pl-2 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
      >
        <ChatIcon icon={artifactIcon(artifact)} size={13} />
        <span className="truncate">{artifact.title}</span>
        {updated && (
          <span
            aria-label="Updated"
            className="size-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400"
          />
        )}
      </button>
      <button
        type="button"
        aria-label={`Close ${artifact.title}`}
        onClick={() => context.close(artifact.id)}
        className="mr-1 inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 outline-none hover:bg-muted hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChatIcon icon={X} size={11} />
      </button>
    </div>
  );
}
