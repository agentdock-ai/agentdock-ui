import type {
  AgentEvent,
  AgentReducerMessage,
  AgentReducerState,
  ContentPart,
  JsonObject,
  JsonValue,
} from "@agentdock-ai/contracts";

import type { AgentHistoryMessage } from "./history.js";

export type RenderMessageRole = AgentReducerMessage["role"];
export type RenderMessageState = "streaming" | "complete" | "stopped" | "error";
export type RenderToolStatus = "running" | "complete" | "failed" | "approval";
export type RenderApprovalKind = "tool-approval" | "custom";
export type RenderApprovalState = "pending" | "resolved";
export type RenderErrorScope = "transport" | "run" | "tool";
export type RenderTurnState =
  Exclude<AgentReducerState["status"], "cancelled"> | "stopped";

export type RenderStreamStatus =
  "idle" | "consuming" | "closed" | "error" | "stopped";

export interface RenderApprovalAction {
  id: string;
  label: string;
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

export interface RenderModelSource {
  history?: readonly AgentHistoryMessage[];
  historyContinuation?: boolean;
  runs: readonly AgentReducerState[];
  /** Complete accepted events per turn, including resumed invocations. */
  turnEvents: readonly (readonly AgentEvent[])[];
  /** Local transport outcomes retained when a later turn begins. */
  turnStreamStatuses?: readonly RenderStreamStatus[];
  streamStatus?: RenderStreamStatus;
  streamError?: unknown | null;
}

export interface RenderTurn {
  id: string;
  runId: string | null;
  sessionId: string | null;
  state: RenderTurnState;
  /** Ordered transcript of messages, tools, approvals and errors. */
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
  streamStatus: RenderStreamStatus;
  transportError?: RenderTransportError;
}
