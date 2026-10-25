import { useState, type ReactNode } from "react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { useArtifacts } from "./artifact-context.js";
import { ArtifactTabs } from "./artifact-tabs.js";
import { ArtifactToolbar } from "./artifact-toolbar.js";
import type { ArtifactMode } from "./artifact-types.js";
import { useArtifactDialog } from "./use-artifact-dialog.js";
import { Button } from "../ui/button.js";
import { cn } from "./utils.js";
export function ArtifactPanel({
  render,
}: {
  render?: (artifact: Artifact, mode: ArtifactMode) => ReactNode;
}) {
  const context = useArtifacts();
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useArtifactDialog(fullscreen);
  const artifact = context?.artifacts.find((a) => a.id === context.activeId);
  const version = artifact?.versions.find(
    (v) => v.version === context?.chosen[artifact.id],
  );
  const current =
    artifact && version
      ? { ...artifact, content: version.content, url: version.url }
      : artifact;
  return (
    <dialog
      ref={ref}
      aria-label="Artifact viewer"
      onCancel={(e) => {
        e.preventDefault();
        context?.dismiss();
      }}
      className={cn(
        "m-0 flex h-full max-h-none min-w-0 max-w-none flex-col border-0 bg-card p-0 text-foreground backdrop:bg-black/40",
        fullscreen
          ? "fixed inset-0 z-50 h-dvh w-screen"
          : "fixed inset-0 z-40 h-dvh w-screen md:static md:h-full md:w-full",
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-medium text-muted-foreground">Artifacts</h2>
        <Button
          onClick={() => context?.dismiss()}
          aria-label="Close artifact panel"
        >
          Close
        </Button>
      </header>
      <ArtifactTabs />
      {current ? (
        <ArtifactPanelBody
          key={current.id}
          artifact={current}
          fullscreen={fullscreen}
          onFullscreen={() => setFullscreen(!fullscreen)}
          render={render}
        />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          Open a file or link to preview it here.
        </p>
      )}
    </dialog>
  );
}
function ArtifactPanelBody({
  artifact,
  fullscreen,
  onFullscreen,
  render,
}: {
  artifact: Artifact;
  fullscreen: boolean;
  onFullscreen: () => void;
  render?: (artifact: Artifact, mode: ArtifactMode) => ReactNode;
}) {
  const [mode, setMode] = useState<ArtifactMode>(
    artifact.kind === "json" ? "tree" : "preview",
  );
  return (
    <>
      <ArtifactToolbar
        artifact={artifact}
        mode={mode}
        setMode={setMode}
        fullscreen={fullscreen}
        onFullscreen={onFullscreen}
      />
      <div
        role="tabpanel"
        aria-label={artifact.title}
        className="min-h-0 min-w-0 flex-1 overflow-auto"
      >
        {render?.(artifact, mode)}
      </div>
    </>
  );
}
