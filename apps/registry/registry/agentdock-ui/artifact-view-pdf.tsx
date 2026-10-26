"use client";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactMediaUrl } from "./artifact-url.js";
import { useArtifactUrl } from "./use-artifact-url.js";
import { ArtifactViewFile } from "./artifact-view-file.js";

export function ArtifactViewPdf({ artifact }: ArtifactViewerProps) {
  const blob = useArtifactUrl(artifact.content, "application/pdf");
  const url = blob ?? artifactMediaUrl(artifact.url);
  if (!url) return <ArtifactViewFile artifact={artifact} />;
  const remote =
    /^https?:/i.test(url) &&
    new URL(url).origin !== globalThis.location?.origin;
  return (
    <iframe
      title={artifact.title}
      src={url}
      // Chromium refuses its PDF viewer inside an empty sandbox. Our own blob is
      // typed application/pdf and same-origin app files are trusted, so neither
      // needs one; other sites stay cross-origin to the app either way.
      sandbox={remote ? "allow-scripts allow-same-origin" : undefined}
      referrerPolicy="no-referrer"
      className="block h-full min-h-96 w-full border-0"
    />
  );
}
