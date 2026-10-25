"use client";
import { useId, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { ChatIcon } from "./icon";
import { useArtifacts } from "./artifact-context";
type TabsState = NonNullable<ReturnType<typeof useArtifacts>>;
function tabKey(
  event: KeyboardEvent<HTMLButtonElement>,
  context: TabsState,
  id: string,
  index: number,
) {
  if (event.key === "Delete") {
    context.close(id);
    return;
  }
  const next =
    event.key === "ArrowRight"
      ? (index + 1) % context.tabs.length
      : event.key === "ArrowLeft"
        ? (index + context.tabs.length - 1) % context.tabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? context.tabs.length - 1
            : undefined;
  if (next !== undefined) {
    event.preventDefault();
    context.open(context.tabs[next]);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
}
interface TabProps {
  context: TabsState;
  artifact: Artifact;
  index: number;
  prefix: string;
}
function ArtifactTab({ context, artifact, index, prefix }: TabProps) {
  const { id, title } = artifact;
  const active = id === context.activeId;
  const updated = !active && artifact.versions.length > (context.seen[id] ?? 0);
  return (
    <div className="flex shrink-0 items-center border-r border-border">
      <button
        type="button"
        role="tab"
        id={`${prefix}-${index}`}
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        onClick={() => context.open(id)}
        onKeyDown={(event) => tabKey(event, context, id, index)}
        className="flex min-h-10 items-center gap-2 px-3 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-selected:bg-muted"
      >
        <span className="max-w-40 truncate">{title}</span>
        {updated && (
          <span
            aria-label="Updated"
            className="size-1.5 rounded-full bg-blue-500"
          />
        )}
      </button>
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={() => context.close(id)}
        className="mr-1 rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ChatIcon icon={X} size={12} />
      </button>
    </div>
  );
}
export function ArtifactTabs() {
  const context = useArtifacts();
  const prefix = useId();
  if (!context) return null;
  return (
    <div
      role="tablist"
      aria-label="Artifacts"
      className="flex min-w-0 overflow-x-auto border-b border-border"
    >
      {context.tabs.map((id, index) => {
        const artifact = context.artifacts.find((a) => a.id === id);
        return artifact ? (
          <ArtifactTab
            key={id}
            context={context}
            artifact={artifact}
            index={index}
            prefix={prefix}
          />
        ) : null;
      })}
    </div>
  );
}
