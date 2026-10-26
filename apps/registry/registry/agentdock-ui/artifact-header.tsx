"use client";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Artifact } from "@agentdock-ai/ui-core";
import type { ArtifactMode } from "./artifact-types.js";
import { useArtifacts } from "./artifact-context.js";
import { artifactDownload } from "./artifact-download.js";
import { artifactDownloadUrl, artifactExternalUrl } from "./artifact-url.js";
import { artifactIcon, artifactLabel } from "./artifact-icon.js";
import { ChatIcon } from "./icon.js";

export const artifactModes: Partial<
  Record<Artifact["kind"], readonly ArtifactMode[]>
> = {
  html: ["preview", "code"],
  markdown: ["preview", "source"],
  json: ["tree", "raw"],
};
const modeLabels: Record<ArtifactMode, string> = {
  preview: "Preview",
  code: "Code",
  source: "Source",
  tree: "Tree",
  raw: "Raw",
};

export interface ArtifactHeaderProps {
  artifact: Artifact;
  mode: ArtifactMode;
  setMode: (mode: ArtifactMode) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  onClose?: () => void;
}

export function ArtifactHeader(props: ArtifactHeaderProps) {
  const { artifact, mode, setMode } = props;
  const modes = artifactModes[artifact.kind];
  return (
    <header className="flex h-11 min-w-0 shrink-0 items-center gap-2 border-b border-border px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ChatIcon
          icon={artifactIcon(artifact)}
          size={14}
          className="text-muted-foreground"
        />
        <div className="min-w-0">
          <h2
            title={artifact.title}
            className="truncate text-xs font-medium leading-4"
          >
            {artifact.title}
          </h2>
          <p className="flex min-w-0 items-center gap-1 text-[10px] leading-3.5 text-muted-foreground">
            <span className="shrink-0">{artifactLabel(artifact)}</span>
            {artifact.versions.length > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <VersionPicker artifact={artifact} />
              </>
            )}
          </p>
        </div>
      </div>
      {modes && (
        <div
          role="group"
          aria-label="View"
          className="flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5"
        >
          {modes.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_0_rgb(0_0_0/0.06)]"
            >
              {modeLabels[value]}
            </button>
          ))}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <CopyButton artifact={artifact} />
        <IconButton
          icon={Download}
          label="Download"
          disabled={
            artifact.content === undefined && !artifactDownloadUrl(artifact)
          }
          onClick={() => artifactDownload(artifact)}
        />
        <ExternalButton artifact={artifact} />
        <IconButton
          icon={props.fullscreen ? Minimize2 : Maximize2}
          label={props.fullscreen ? "Exit full screen" : "Full screen"}
          pressed={props.fullscreen}
          onClick={props.onFullscreen}
        />
        {props.onClose && (
          <IconButton
            icon={X}
            label="Close artifact panel"
            onClick={props.onClose}
          />
        )}
      </div>
    </header>
  );
}

/** Compact version captions keep the full version labels accessible. */
function VersionPicker({ artifact }: { artifact: Artifact }) {
  const context = useArtifacts();
  const total = artifact.versions.length;
  if (!context) return null;
  return (
    <select
      aria-label="Artifact version"
      title={`Version ${context.chosen[artifact.id] ?? total} of ${total}`}
      value={context.chosen[artifact.id] ?? total}
      onChange={(e) => {
        const version = Number(e.target.value);
        context.selectVersion(
          artifact.id,
          version === total ? undefined : version,
        );
      }}
      className="min-w-0 cursor-pointer truncate rounded bg-transparent pr-1 text-[10px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {[...artifact.versions].reverse().map((v) => (
        <option
          key={v.version}
          value={v.version}
          aria-label={`Version ${v.version} of ${total}${v.version === total ? " (latest)" : ""}`}
        >
          v{v.version} / {total}
        </option>
      ))}
    </select>
  );
}

function CopyButton({ artifact }: { artifact: Artifact }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [state]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        artifact.content ?? artifact.url ?? "",
      );
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <>
      <IconButton
        icon={state === "copied" ? Check : Copy}
        label="Copy"
        onClick={() => void copy()}
      />
      <span role="status" className="sr-only">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy unavailable"
            : ""}
      </span>
    </>
  );
}

function ExternalButton({ artifact }: { artifact: Artifact }) {
  const url = artifactExternalUrl(artifact);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in new tab"
      title="Open in new tab"
      className={iconButtonClass}
    >
      <ChatIcon icon={ExternalLink} size={15} />
    </a>
  );
}

const iconButtonClass =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-muted aria-pressed:text-foreground motion-reduce:transition-none [@media(pointer:coarse)]:size-8";

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={iconButtonClass}
    >
      <ChatIcon icon={icon} size={15} />
    </button>
  );
}
