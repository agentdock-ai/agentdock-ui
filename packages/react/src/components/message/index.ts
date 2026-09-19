export { Message, type MessageProps } from "./message.js";
export { UserMessage, type UserMessageProps } from "./user-message.js";
export { AssistantMessage, type AssistantMessageProps } from "./assistant-message.js";
export { ToolMessage, type ToolMessageProps } from "./tool-message.js";
export {
  MessageContent,
  defaultRenderContentPart,
  type MessageContentProps,
} from "./message-content.js";
export { selectRenderMessages, type RenderMessageSource } from "@agentdock-ai/ui-core";
export type {
  MessageClassNames,
  MessageComponentProps,
  RenderMessage,
  RenderMessageRole,
  RenderMessageState,
  RenderTool,
  RenderToolStatus,
} from "./types.js";
