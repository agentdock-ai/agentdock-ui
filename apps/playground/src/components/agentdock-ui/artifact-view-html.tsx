"use client";
import type { ArtifactViewerProps } from "./artifact-types";
import { ArtifactHtmlLinks } from "./artifact-html-links";
import { ArtifactViewCode } from "./artifact-view-code";
export function ArtifactViewHtml(props: ArtifactViewerProps) {
  if (props.mode === "code") return <ArtifactViewCode {...props} />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ArtifactHtmlLinks content={props.artifact.content} />
      <iframe
        title={`${props.artifact.title} preview`}
        srcDoc={`<base target="_blank">${props.artifact.content ?? ""}`}
        sandbox={props.allowHtmlScripts ? "allow-scripts" : ""}
        referrerPolicy="no-referrer"
        className="min-h-96 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
