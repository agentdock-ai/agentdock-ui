import {
  defaultArtifactMapper,
  type ArtifactDraft,
  type RenderTool,
} from "@agentdock-ai/ui-core";
function readContent(output: RenderTool["output"]): string | undefined {
  let value: unknown = output;
  if (typeof output === "string") {
    try {
      value = JSON.parse(output);
    } catch {
      return output;
    }
  }
  if (
    value &&
    typeof value === "object" &&
    "content" in value &&
    typeof value.content === "string"
  )
    return value.content;
  return typeof output === "string" ? output : undefined;
}
export function playgroundArtifactMapper(
  tool: RenderTool,
): ArtifactDraft | undefined {
  if (tool.status !== "complete") return;
  if (tool.name === "create_file" || tool.name === "update_file")
    return defaultArtifactMapper(tool);
  if (
    tool.name !== "read_file" ||
    typeof tool.input.path !== "string" ||
    !tool.input.path
  )
    return;
  const content = readContent(tool.output);
  if (content === undefined) return;
  const path = tool.input.path;
  return { id: path, title: path.split(/[\\/]/).pop() || path, content };
}
