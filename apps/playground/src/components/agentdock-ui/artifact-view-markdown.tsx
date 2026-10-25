"use client";
import type { ArtifactViewerProps } from "./artifact-types";
import { MarkdownContent } from "./markdown-content";
import { ArtifactViewCode } from "./artifact-view-code";
export function ArtifactViewMarkdown(props: ArtifactViewerProps) {
  return props.mode === "source" ? (
    <ArtifactViewCode {...props} />
  ) : (
    <div className="p-4">
      <MarkdownContent text={props.artifact.content ?? ""} />
    </div>
  );
}
