import type {
  AgentReducerMessage,
  ContentPart,
  JsonObject,
  JsonValue,
} from "@agentdock-ai/contracts";
import type { ReactNode } from "react";

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

export interface MessageClassNames {
  root?: string;
  avatar?: string;
  body?: string;
  label?: string;
  content?: string;
  toolCard?: string;
  toolTop?: string;
  toolIcon?: string;
  toolInfo?: string;
  toolState?: string;
  toolDetail?: string;
  toolProgress?: string;
}

export interface MessageComponentProps {
  message: AgentReducerMessage;
  className?: string;
  classNames?: MessageClassNames;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}
