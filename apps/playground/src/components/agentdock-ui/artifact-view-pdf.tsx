import type { ArtifactViewerProps } from "./artifact-types";
import { artifactMediaUrl } from "./artifact-url";
import { useArtifactUrl } from "./use-artifact-url";
import { ArtifactViewFile } from "./artifact-view-file";
export function ArtifactViewPdf({ artifact }: ArtifactViewerProps) {
  const blob = useArtifactUrl(artifact.content, "application/pdf");
  const url = blob ?? artifactMediaUrl(artifact.url);
  return url ? (
    <div className="flex h-full min-h-96 flex-col">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-3 text-xs underline"
      >
        Open PDF in new tab
      </a>
      <iframe
        title={artifact.title}
        src={url}
        sandbox=""
        referrerPolicy="no-referrer"
        className="min-h-80 w-full flex-1 border-0"
      />
    </div>
  ) : (
    <ArtifactViewFile artifact={artifact} />
  );
}
