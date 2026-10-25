import type { Artifact } from "@agentdock-ai/ui-core";
import { artifactDownloadUrl } from "./artifact-url.js";
export function artifactDownload(artifact: Artifact) {
  const content = artifact.content;
  const url =
    content === undefined
      ? artifactDownloadUrl(artifact)
      : URL.createObjectURL(
          new Blob([content], {
            type: artifact.mimeType || "application/octet-stream",
          }),
        );
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = artifact.title.split(/[\\/]/).pop() || "download";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
  if (content !== undefined) setTimeout(() => URL.revokeObjectURL(url), 1000);
}
