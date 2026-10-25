import type { ArtifactDraft } from "./artifact-types.js";
/** Only complete tools with full inline file content qualify. Patches are not full files. */
import type { RenderTool } from "../render-model.js";
export const defaultArtifactMapper = (
  tool: RenderTool,
): ArtifactDraft | undefined => {
  if (tool.status !== "complete") return;
  const { path, content } = tool.input;
  if (typeof path !== "string" || !path || typeof content !== "string") return;
  return { id: path, title: path.split(/[\\/]/).pop() || path, content };
};
