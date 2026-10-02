import type {
  AgentEvent,
  AgentReducerMessage,
  AgentReducerState,
  ContentPart,
  JsonObject,
  JsonValue,
} from "@agentdock-ai/contracts";

export type RenderMessageRole = AgentReducerMessage["role"];
export type RenderMessageState = "streaming" | "complete" | "stopped" | "error";
export type RenderToolStatus = "running" | "complete" | "failed" | "approval";
export type RenderReasoningState = "streaming" | "complete";
export type RenderApprovalKind = "tool-approval" | "custom";
export type RenderApprovalState = "pending" | "resolved";
export type RenderErrorScope = "transport" | "run" | "tool";
export type RenderTurnState =
  Exclude<AgentReducerState["status"], "cancelled"> | "stopped";

export type RenderStreamStatus =
  "idle" | "consuming" | "closed" | "error" | "stopped";

export interface RenderReasoning {
  text: string;
  state: RenderReasoningState;
  startedAt?: string;
  completedAt?: string;
}

export interface RenderApprovalAction {
  id: string;
  label: string;
  kind: "approve" | "deny" | "custom";
  input: JsonValue;
  toolCallId?: string;
}

export interface RenderApproval {
  interruptId: string;
  kind: RenderApprovalKind;
  title: string;
  detail: string;
  actions: readonly RenderApprovalAction[];
  state: RenderApprovalState;
  decisions: readonly JsonValue[];
  payload?: JsonValue;
}

export interface RenderError {
  title: string;
  detail: string;
  retryable: boolean;
  scope: RenderErrorScope;
  code?: string;
}

export interface RenderTool {
  toolCallId: string;
  name: string;
  input: JsonObject;
  progress: readonly ContentPart[];
  output?: JsonValue;
  error?: string;
  errorCode?: string;
  status: RenderToolStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface RenderMessage {
  id: string;
  runId: string | null;
  role: RenderMessageRole;
  content: readonly ContentPart[];
  state: RenderMessageState;
  reasoning?: RenderReasoning;
  tool?: RenderTool;
  approval?: RenderApproval;
  error?: RenderError;
}

export interface RenderMessageSource {
  /** Events accepted by the store, grouped by turn across resumed invocations. */
  turnEvents?: readonly (readonly AgentEvent[])[];
  runs: readonly import("@agentdock-ai/contracts").AgentReducerState[];
  events: readonly AgentEvent[];
  /** Durable turn snapshots may be supplied when diagnostic events are evicted. */
  history?: readonly RenderTurn[];
  streamStatus?: RenderStreamStatus;
  streamError?: unknown | null;
}

export interface RenderTurn {
  id: string;
  runId: string | null;
  sessionId: string | null;
  state: RenderTurnState;
  messages: readonly RenderMessage[];
  /** Ordered V1 transcript; messages remains the legacy compatibility view. */
  items: readonly RenderTurnItem[];
  /** Local transport state, separate from canonical run lifecycle. */
  transportState?: RenderStreamStatus;
  usage: AgentReducerState["usage"];
  limit: AgentReducerState["limit"];
  finishReason: string | null;
  cancellationReason: string | null;
  startedAt?: string;
  completedAt?: string;
  error?: RenderError;
}

export type RenderContentBlock = {
  id: string;
  position: number;
  state: RenderMessageState;
  startedAt?: string;
  completedAt?: string;
} & Exclude<ContentPart, { type: "tool-call" | "tool-result" }>;

interface RenderItemBase {
  id: string;
  runId: string | null;
  phaseId: string | null;
  position: number;
}

export interface RenderMessageItem extends RenderItemBase {
  type: "message";
  messageId: string;
  role: RenderMessageRole;
  state: RenderMessageState;
  blocks: readonly RenderContentBlock[];
}

export interface RenderToolCallItem extends RenderItemBase {
  type: "tool-call";
  tool: RenderTool;
  active: boolean;
}

export interface RenderToolTimelineItem extends RenderItemBase {
  type: "tool-timeline";
  tools: readonly RenderToolCallItem[];
}

export interface RenderApprovalItem extends RenderItemBase {
  type: "approval";
  approval: RenderApproval;
  toolCallId?: string;
}

export interface RenderErrorItem extends RenderItemBase {
  type: "error";
  error: RenderError;
}

export type RenderTurnItem =
  | RenderMessageItem
  | RenderToolCallItem
  | RenderToolTimelineItem
  | RenderApprovalItem
  | RenderErrorItem;

export interface RenderTransportError {
  title: string;
  detail: string;
  retryable: boolean;
  scope: "transport";
}

export interface RenderModel {
  turns: readonly RenderTurn[];
  messages: readonly RenderMessage[];
  streamStatus: RenderStreamStatus;
  transportError?: RenderTransportError;
}
