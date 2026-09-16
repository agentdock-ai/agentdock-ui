import type { AgentReducerMessage, ContentPart } from "@agentdock-ai/contracts";
import type { ReactNode } from "react";

export interface MessageClassNames {
  root?: string;
  avatar?: string;
  body?: string;
  label?: string;
  content?: string;
}

export interface MessageComponentProps {
  message: AgentReducerMessage;
  className?: string;
  classNames?: MessageClassNames;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}
