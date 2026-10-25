import { ARTIFACT_INLINE_BYTES } from "./artifact-limits.js";
import { artifactBytes } from "./artifact-text.js";
import { jsonTree } from "./json-tree.js";
/** Raw source is the safe escape when pretty formatting exceeds the tree or byte budget. */
export function formatArtifactJson(content: string, value: unknown): string {
  try {
    if (jsonTree(value).truncated) return content;
    const formatted = JSON.stringify(value, null, 2);
    return formatted !== undefined &&
      artifactBytes(formatted) <= ARTIFACT_INLINE_BYTES
      ? formatted
      : content;
  } catch {
    return content;
  }
}
