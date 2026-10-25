import {
  ARTIFACT_INLINE_BYTES,
  artifactBytes,
  type ArtifactKind,
} from "@agentdock-ai/ui-core";
import type { ArtifactViewer, ArtifactViewerProps } from "./artifact-types";
import { ArtifactViewCode } from "./artifact-view-code";
import { ArtifactViewText } from "./artifact-view-text";
import { ArtifactViewMarkdown } from "./artifact-view-markdown";
import { ArtifactViewJson } from "./artifact-view-json";
import { ArtifactViewCsv } from "./artifact-view-csv";
import { ArtifactViewFile } from "./artifact-view-file";
const viewers: Partial<Record<ArtifactKind, ArtifactViewer>> = {
  code: ArtifactViewCode,
  text: ArtifactViewText,
  markdown: ArtifactViewMarkdown,
  json: ArtifactViewJson,
  csv: ArtifactViewCsv,
};
export function ArtifactView({
  viewers: overrides,
  ...props
}: ArtifactViewerProps & {
  viewers?: Partial<Record<ArtifactKind, ArtifactViewer>>;
}) {
  const View =
    artifactBytes(props.artifact.content) > ARTIFACT_INLINE_BYTES
      ? ArtifactViewFile
      : (overrides?.[props.artifact.kind] ??
        viewers[props.artifact.kind] ??
        ArtifactViewFile);
  return <View {...props} />;
}
