import type { Artifact } from "@agentdock-ai/ui-core";
import { safeUrl } from "./utils.js";
export function artifactDownload(artifact: Artifact) {
  const content = artifact.content;
  const url =
    content === undefined
      ? safeUrl(artifact.url)
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
  link.click();
  if (content !== undefined) setTimeout(() => URL.revokeObjectURL(url), 0);
}
