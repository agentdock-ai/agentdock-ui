import type {
  AgentEvent,
  AgentReducerMessage,
  ContentPart,
  JsonObject,
  JsonValue,
} from "@agentdock-ai/contracts";

export type RenderMessageRole = AgentReducerMessage["role"];
export type RenderMessageState = "streaming" | "complete";
export type RenderToolStatus = "running" | "complete" | "failed" | "approval";

export interface RenderTool {
  toolCallId: string;
  name: string;
  input: JsonObject;
  progress: readonly ContentPart[];
  output?: JsonValue;
  error?: string;
  status: RenderToolStatus;
}

export interface RenderMessage {
  id: string;
  role: RenderMessageRole;
  content: readonly ContentPart[];
  state: RenderMessageState;
  tool?: RenderTool;
}

export interface RenderMessageSource {
  runs: readonly import("@agentdock-ai/contracts").AgentReducerState[];
  events: readonly AgentEvent[];
}
