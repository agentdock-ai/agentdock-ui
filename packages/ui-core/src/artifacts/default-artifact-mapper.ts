import type { ArtifactMapper } from "./artifact-types.js";
/** Only complete tools with full inline file content qualify. Patches are not full files. */
export const defaultArtifactMapper: ArtifactMapper = (tool) => {
  if (tool.status !== "complete") return;
  const { path, content } = tool.input;
  if (typeof path !== "string" || !path || typeof content !== "string") return;
  return { id: path, title: path.split(/[\\/]/).pop() || path, content };
};
