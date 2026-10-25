"use client";
import type { ArtifactViewerProps } from "./artifact-types";
import { ArtifactViewCode } from "./artifact-view-code";
export function ArtifactViewHtml(props: ArtifactViewerProps) {
  if (props.mode === "code") return <ArtifactViewCode {...props} />;
  return (
    <iframe
      title={`${props.artifact.title} preview`}
      srcDoc={`<base target="_blank">${props.artifact.content ?? ""}`}
      sandbox={props.allowHtmlScripts ? "allow-scripts" : ""}
      referrerPolicy="no-referrer"
      className="h-full min-h-96 w-full border-0 bg-white"
    />
  );
}
