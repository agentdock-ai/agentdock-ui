import { AssistantMessage } from "./assistant-message.js";
import { ToolMessage } from "./tool-message.js";
import { UserMessage } from "./user-message.js";
import type { MessageClassNames } from "./types.js";
import type { AgentReducerMessage, ContentPart } from "@agentdock-ai/contracts";
import type { ReactNode } from "react";

export interface MessageProps {
  message: AgentReducerMessage;
  className?: string;
  classNames?: MessageClassNames;
  renderContentPart?: (part: ContentPart, index: number) => ReactNode;
}

export function Message({ message, className, classNames, renderContentPart }: MessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} className={className} classNames={classNames} renderContentPart={renderContentPart} />;
  }
  if (message.role === "tool") {
    return <ToolMessage message={message} className={className} classNames={classNames} renderContentPart={renderContentPart} />;
  }
  return <AssistantMessage message={message} className={className} classNames={classNames} renderContentPart={renderContentPart} />;
}
