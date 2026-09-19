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
export type RenderTurnState = Exclude<AgentReducerState["status"], "cancelled"> | "stopped";

export type RenderStreamStatus = "idle" | "consuming" | "closed" | "error";

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
  runs: readonly import("@agentdock-ai/contracts").AgentReducerState[];
  events: readonly AgentEvent[];
  streamStatus?: RenderStreamStatus;
  streamError?: unknown | null;
}

export interface RenderTurn {
  id: string;
  runId: string | null;
  sessionId: string | null;
  state: RenderTurnState;
  messages: readonly RenderMessage[];
  usage: AgentReducerState["usage"];
  limit: AgentReducerState["limit"];
  finishReason: string | null;
  cancellationReason: string | null;
  startedAt?: string;
  completedAt?: string;
  error?: RenderError;
}

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
