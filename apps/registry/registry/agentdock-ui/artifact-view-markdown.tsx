"use client";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { MarkdownContent } from "./markdown-content.js";
import { ArtifactViewCode } from "./artifact-view-code.js";

export function ArtifactViewMarkdown(props: ArtifactViewerProps) {
  return props.mode === "source" ? (
    <ArtifactViewCode {...props} />
  ) : (
    <article className="mx-auto max-w-3xl px-4 py-4">
      <MarkdownContent text={props.artifact.content ?? ""} />
    </article>
  );
}
