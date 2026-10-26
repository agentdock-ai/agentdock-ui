"use client";
import { htmlPreviewDocument, htmlPreviewSandbox } from "@agentdock-ai/ui-core";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { ArtifactViewCode } from "./artifact-view-code.js";

export function ArtifactViewHtml(props: ArtifactViewerProps) {
  if (props.mode === "code") return <ArtifactViewCode {...props} />;
  return (
    <iframe
      title={`${props.artifact.title} preview`}
      srcDoc={htmlPreviewDocument(props.artifact.content)}
      // Never combined with allow-same-origin: the page can't reach the app.
      sandbox={htmlPreviewSandbox(props.allowHtmlScripts)}
      referrerPolicy="no-referrer"
      className="block h-full min-h-96 w-full border-0 bg-white"
    />
  );
}
