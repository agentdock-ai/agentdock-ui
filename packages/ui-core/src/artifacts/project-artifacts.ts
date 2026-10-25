import type { RenderModel, RenderTurnItem } from "../render-model.js";
import type { Artifact, ArtifactMapper } from "./artifact-types.js";
import { defaultArtifactMapper } from "./default-artifact-mapper.js";
import { artifactKind } from "./artifact-kind.js";
function tools(item: RenderTurnItem) {
  return item.type === "tool-call"
    ? [item.tool]
    : item.type === "tool-timeline"
      ? item.tools.map((t) => t.tool)
      : [];
}
/** Project file versions in transcript order, retaining a stable tab id per path. */
export function projectArtifacts(
  model: RenderModel,
  mapper: ArtifactMapper = defaultArtifactMapper,
): Artifact[] {
  const artifacts = new Map<string, Artifact>();
  const seen = new Set<string>();
  for (const tool of model.turns.flatMap((turn) => turn.items.flatMap(tools))) {
    if (tool.status !== "complete" || seen.has(tool.toolCallId)) continue;
    seen.add(tool.toolCallId);
    const mapped = mapper(tool);
    if (!mapped) continue;
    for (const draft of "id" in mapped ? [mapped] : mapped) {
      const previous = artifacts.get(draft.id);
      const versions = [
        ...(previous?.versions ?? []),
        {
          version: (previous?.versions.length ?? 0) + 1,
          content: draft.content,
          url: draft.url,
          toolCallId: tool.toolCallId,
          updatedAt: tool.completedAt,
        },
      ];
      artifacts.set(draft.id, {
        ...draft,
        kind: artifactKind(draft.id, draft.mimeType, draft.url),
        versions,
        sourceToolCallId: tool.toolCallId,
      });
    }
  }
  return [...artifacts.values()];
}
