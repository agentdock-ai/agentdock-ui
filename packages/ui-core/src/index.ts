export { AgentStore } from "./core/agent-store.js";
export type { AgentHistory, AgentHistoryMessage } from "./history.js";
export type {
  AgentStoreListener,
  AgentStoreSnapshot,
  AgentStreamStatus,
} from "./core/agent-store.js";
export {
  consumeAgentStream,
  type ConsumeAgentStreamOptions,
} from "./core/consume-agent-stream.js";
export {
  decodeAgentEventStream,
  type DecodeAgentEventStreamOptions,
} from "./core/decode-agent-event-stream.js";
export {
  selectRenderModel,
  type RenderModelSource,
} from "./select-render-model.js";
export type {
  RenderContentBlock,
  RenderTurnItem,
  RenderMessageItem,
  RenderToolCallItem,
  RenderToolTimelineItem,
  RenderApprovalItem,
  RenderErrorItem,
  RenderApproval,
  RenderApprovalAction,
  RenderApprovalKind,
  RenderApprovalState,
  RenderError,
  RenderErrorScope,
  RenderMessageRole,
  RenderMessageState,
  RenderModel,
  RenderTool,
  RenderToolStatus,
  RenderTransportError,
  RenderStreamStatus,
  RenderTurn,
  RenderTurnState,
} from "./render-model.js";
export type {
  AgentEvent,
  AgentReducerMessage,
  AgentReducerState,
  AgentToolProgress,
  ContentPart,
  JsonObject,
  JsonValue,
  ToolCallRecord,
  ToolErrorRecord,
  ToolResultRecord,
} from "@agentdock-ai/contracts";
export { parseTagAttributes } from "./blocks/tag-attributes.js";
export { parseTaggedBlocks } from "./blocks/tagged-blocks.js";
export type {
  TaggedBlock,
  TaggedSegment,
  TaggedBlockOptions,
} from "./blocks/tagged-blocks.js";
export { parseChartSpec } from "./blocks/chart-spec.js";
export type {
  ChartSpec,
  ChartSpecResult,
  CartesianChartSpec,
  PieChartSpec,
} from "./blocks/chart-types.js";
export { CHART_LIMITS } from "./blocks/chart-limits.js";
export { niceTicks, linearScale, formatValue } from "./blocks/chart-scale.js";
export {
  chartLayout,
  chartBars,
  chartPaths,
  CHART_PLOT,
} from "./blocks/chart-layout.js";
export { chartSlices } from "./blocks/chart-pie-layout.js";
export type {
  Artifact,
  ArtifactDraft,
  ArtifactVersion,
  ArtifactKind,
  ArtifactMapper,
} from "./artifacts/artifact-types.js";
export { artifactKind, codeLanguage } from "./artifacts/artifact-kind.js";
export { defaultArtifactMapper } from "./artifacts/default-artifact-mapper.js";
export { projectArtifacts } from "./artifacts/project-artifacts.js";
export { parseCsv, type CsvResult } from "./artifacts/csv.js";
export {
  ARTIFACT_INLINE_BYTES,
  CSV_PAGE_ROWS,
  CSV_MAX_ROWS,
  JSON_MAX_NODES,
} from "./artifacts/artifact-limits.js";
export {
  parseArtifactJson,
  jsonTree,
  visibleJsonNodes,
  type JsonTreeNode,
  type JsonTreeResult,
} from "./artifacts/json-tree.js";
export {
  artifactTextMatches,
  sortCsvRows,
  artifactBytes,
  type TextMatch,
} from "./artifacts/artifact-text.js";
export { insertDraftText, type DraftInsertion } from "./composer-text.js";

export { formatArtifactJson } from "./artifacts/format-artifact-json.js";
