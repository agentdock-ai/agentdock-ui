"use client";
import { useState } from "react";
import type { Artifact } from "@agentdock-ai/ui-core";
import { Button } from "./ui/button";
import type { ArtifactMode } from "./artifact-types";
import { useArtifacts } from "./artifact-context";
import { artifactDownload } from "./artifact-download";
import { artifactExternalUrl, artifactDownloadUrl } from "./artifact-url";
const modes: Partial<Record<Artifact["kind"], readonly ArtifactMode[]>> = {
  html: ["preview", "code"],
  markdown: ["preview", "source"],
  json: ["tree", "raw"],
};
function VersionPicker({ artifact }: { artifact: Artifact }) {
  const context = useArtifacts();
  if (artifact.versions.length < 2) return null;
  return (
    <select
      aria-label="Artifact version"
      value={context?.chosen[artifact.id] ?? "latest"}
      onChange={(e) =>
        context?.selectVersion(
          artifact.id,
          e.target.value === "latest" ? undefined : Number(e.target.value),
        )
      }
      className="max-w-44 rounded border border-border bg-background p-1"
    >
      <option value="latest">Latest (v{artifact.versions.length})</option>
      {artifact.versions.map((v) => (
        <option key={v.version} value={v.version}>
          v{v.version}
          {v.updatedAt ? ` · ${v.updatedAt}` : ""}
        </option>
      ))}
    </select>
  );
}
function ArtifactActions({ artifact }: { artifact: Artifact }) {
  const [copy, setCopy] = useState("");
  const url = artifactExternalUrl(artifact);
  async function copyContent() {
    try {
      const text = artifact.content ?? artifact.url ?? "";
      await navigator.clipboard.writeText(text);
      setCopy("Copied");
    } catch {
      setCopy("Copy unavailable");
    }
  }
  return (
    <>
      <span className="flex-1" />
      <Button onClick={() => void copyContent()}>Copy</Button>
      <Button
        disabled={
          artifact.content === undefined && !artifactDownloadUrl(artifact)
        }
        onClick={() => artifactDownload(artifact)}
      >
        Download
      </Button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-2 py-1 underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Open in new tab
        </a>
      )}
      <span role="status" className="sr-only">
        {copy}
      </span>
    </>
  );
}
interface ToolbarProps {
  artifact: Artifact;
  mode: ArtifactMode;
  setMode: (mode: ArtifactMode) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
}
export function ArtifactToolbar({
  artifact,
  mode,
  setMode,
  fullscreen,
  onFullscreen,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2 text-xs">
      <VersionPicker artifact={artifact} />
      {modes[artifact.kind]?.map((value) => (
        <Button
          key={value}
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className="capitalize"
        >
          {value}
        </Button>
      ))}
      <ArtifactActions
        key={`${artifact.id}:${artifact.versions.length}`}
        artifact={artifact}
      />
      <Button onClick={onFullscreen} aria-pressed={fullscreen}>
        {fullscreen ? "Exit full screen" : "Full screen"}
      </Button>
    </div>
  );
}
