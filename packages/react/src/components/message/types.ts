import type {
  AgentReducerMessage,
  ContentPart,
  JsonObject,
  JsonValue,
  RenderMessage,
  RenderMessageRole,
  RenderMessageState,
  RenderTool,
  RenderToolStatus,
} from "@agentdock-ai/ui-core";
import type { ReactNode } from "react";

export type {
  RenderMessage,
  RenderMessageRole,
  RenderMessageState,
  RenderTool,
  RenderToolStatus,
};

export type { AgentReducerMessage, ContentPart, JsonObject, JsonValue };

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
