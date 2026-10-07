export {
  AgentStore,
  consumeAgentStream,
  decodeAgentEventStream,
  selectRenderModel,
} from "@agentdock-ai/ui-core";
export type {
  AgentHistory,
  AgentHistoryMessage,
  AgentReducerMessage,
  AgentStoreListener,
  AgentStoreSnapshot,
  AgentStreamStatus,
  ConsumeAgentStreamOptions,
  DecodeAgentEventStreamOptions,
  RenderApproval,
  RenderApprovalAction,
  RenderApprovalKind,
  RenderApprovalState,
  RenderError,
  RenderErrorScope,
  RenderModelSource,
  RenderModel,
  RenderStreamStatus,
  RenderTransportError,
  RenderTurn,
  RenderTurnState,
} from "@agentdock-ai/ui-core";
export {
  AgentProvider,
  useAgentStore,
  type AgentProviderProps,
} from "./react/agent-provider.js";
export { useAgentState } from "./react/use-agent-state.js";
export type {
  AgentEventStream,
  ChatAdapter,
  ChatAttachment,
  ChatAttachmentAdapter,
} from "./react/chat-adapter.js";
export type { AgentEvent } from "@agentdock-ai/ui-core";

export { useAgentActions } from "./react/use-agent-actions.js";
export type { ChatActionState } from "./react/chat-actions.js";
export { createConversationClient } from "./react/conversation-client.js";
export type {
  ConversationClient,
  ConversationClientOptions,
} from "./react/conversation-client.js";
export { useConversations } from "./react/use-conversations.js";
export type { ConversationHookState } from "./react/use-conversations.js";
