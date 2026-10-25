import {
  ARTIFACT_INLINE_BYTES,
  artifactBytes,
  type ArtifactKind,
} from "@agentdock-ai/ui-core";
import type { ArtifactViewer, ArtifactViewerProps } from "./artifact-types.js";
import { ArtifactViewCode } from "./artifact-view-code.js";
import { ArtifactViewText } from "./artifact-view-text.js";
import { ArtifactViewMarkdown } from "./artifact-view-markdown.js";
import { ArtifactViewJson } from "./artifact-view-json.js";
import { ArtifactViewCsv } from "./artifact-view-csv.js";
import { ArtifactViewFile } from "./artifact-view-file.js";
import { ArtifactViewHtml } from "./artifact-view-html.js";
import { ArtifactViewImage } from "./artifact-view-image.js";
import { ArtifactViewPdf } from "./artifact-view-pdf.js";
import { ArtifactViewLink } from "./artifact-view-link.js";
const viewers: Partial<Record<ArtifactKind, ArtifactViewer>> = {
  html: ArtifactViewHtml,
  image: ArtifactViewImage,
  pdf: ArtifactViewPdf,
  link: ArtifactViewLink,
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
