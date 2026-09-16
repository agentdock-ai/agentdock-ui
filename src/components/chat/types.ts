import type { MessageClassNames } from "../message/types.js";

export interface AgentChatClassNames {
  root?: string;
  scroll?: string;
  messageList?: string;
  message?: MessageClassNames;
  emptyState?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  typing?: string;
  toolSection?: string;
  toolSectionLabel?: string;
  toolCard?: string;
  toolTop?: string;
  toolIcon?: string;
  toolInfo?: string;
  toolState?: string;
  toolDetail?: string;
  toolProgress?: string;
  error?: string;
  composer?: string;
  composerInput?: string;
  composerFooter?: string;
  composerSubmit?: string;
}
