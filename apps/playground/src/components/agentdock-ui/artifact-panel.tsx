"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PanelRight, X } from "lucide-react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { useArtifacts } from "./artifact-context";
import { ArtifactTabs } from "./artifact-tabs";
import { ArtifactHeader } from "./artifact-header";
import type { ArtifactMode } from "./artifact-types";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

type RenderArtifact = (
  artifact: Artifact,
  mode: ArtifactMode,
  onModeChange: (mode: ArtifactMode) => void,
) => ReactNode;

export function ArtifactPanel({ render }: { render?: RenderArtifact }) {
  const context = useArtifacts();
  const [fullscreen, setFullscreen] = useState(false);
  const artifact = context?.artifacts.find((a) => a.id === context.activeId);
  const version = artifact?.versions.find(
    (v) => v.version === context?.chosen[artifact.id],
  );
  const current =
    artifact && version
      ? { ...artifact, content: version.content, url: version.url }
      : artifact;
  const dismiss = () => {
    setFullscreen(false);
    context?.dismiss();
  };
  return (
    <ArtifactDialog
      fullscreen={fullscreen}
      // Esc leaves full screen first, then closes the panel.
      onEscape={() => (fullscreen ? setFullscreen(false) : dismiss())}
    >
      {(context?.tabs.length ?? 0) > 1 && <ArtifactTabs />}
      {current ? (
        <ArtifactBody
          key={current.id}
          artifact={current}
          fullscreen={fullscreen}
          onFullscreen={() => setFullscreen(!fullscreen)}
          onClose={dismiss}
          render={render}
        />
      ) : (
        <EmptyPanel onClose={dismiss} />
      )}
    </ArtifactDialog>
  );
}

/**
 * A native dialog: modal (focus-trapped, chat inert) on phones and in full
 * screen, non-modal beside the chat on wider screens.
 */
function ArtifactDialog({
  fullscreen,
  onEscape,
  children,
}: {
  fullscreen: boolean;
  onEscape: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    const phone = window.matchMedia?.("(max-width: 767px)");
    function show() {
      if (!dialog) return;
      if (dialog.open) dialog.close?.();
      const modal = Boolean(phone?.matches) || fullscreen;
      if (modal) dialog.showModal?.();
      else dialog.show?.();
      dialog.toggleAttribute("aria-modal", modal);
      // Renderers without native dialog methods still need it visible.
      dialog.setAttribute("open", "");
    }
    show();
    phone?.addEventListener("change", show);
    return () => {
      phone?.removeEventListener("change", show);
      dialog.close?.();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [fullscreen]);
  return (
    <dialog
      ref={ref}
      aria-label="Artifact viewer"
      onCancel={(event) => {
        event.preventDefault();
        onEscape();
      }}
      className={cn(
        "m-0 flex h-full max-h-none min-w-0 max-w-none flex-col overflow-hidden border-0 bg-card p-0 text-foreground backdrop:bg-black/40",
        "[&_*]:[scrollbar-width:thin] [&_*]:[scrollbar-color:color-mix(in_srgb,var(--muted-foreground)_30%,transparent)_transparent] [&_*::-webkit-scrollbar]:size-1.5 [&_*::-webkit-scrollbar-track]:bg-transparent [&_*::-webkit-scrollbar-thumb]:min-h-8 [&_*::-webkit-scrollbar-thumb]:min-w-8 [&_*::-webkit-scrollbar-thumb]:rounded-full [&_*::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_*::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50 [&_*::-webkit-scrollbar-corner]:bg-transparent",
        fullscreen
          ? "fixed inset-0 z-50 h-dvh w-screen"
          : "fixed inset-0 z-40 h-dvh w-screen md:static md:h-full md:w-full",
      )}
    >
      {children}
    </dialog>
  );
}

function ArtifactBody({
  artifact,
  fullscreen,
  onFullscreen,
  onClose,
  render,
}: {
  artifact: Artifact;
  fullscreen: boolean;
  onFullscreen: () => void;
  onClose: () => void;
  render?: RenderArtifact;
}) {
  const [mode, setMode] = useState<ArtifactMode>(
    artifact.kind === "json" ? "tree" : "preview",
  );
  return (
    <>
      <ArtifactHeader
        artifact={artifact}
        mode={mode}
        setMode={setMode}
        fullscreen={fullscreen}
        onFullscreen={onFullscreen}
        onClose={onClose}
      />
      <div
        role="tabpanel"
        aria-label={artifact.title}
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-background outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
      >
        {render?.(artifact, mode, setMode)}
      </div>
    </>
  );
}

function EmptyPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <button
        type="button"
        aria-label="Close artifact panel"
        title="Close artifact panel"
        onClick={onClose}
        className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <ChatIcon icon={X} size={15} />
      </button>
      <ChatIcon icon={PanelRight} size={22} className="text-muted-foreground" />
      <p className="text-sm font-medium">Nothing open</p>
      <p className="max-w-56 text-xs leading-5 text-muted-foreground">
        Open a file or link from the chat to preview it here.
      </p>
    </div>
  );
}
