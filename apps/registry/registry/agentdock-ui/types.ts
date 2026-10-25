import type { ArtifactOptions } from "./artifact-types.js";
import type { ChatAdapter, AgentStore } from "@agentdock-ai/react";
import type { ToolRisk } from "./approval-card.js";
export interface ChatProps {
  adapter: ChatAdapter;
  /** Opt in to file previews; link interception remains separately opt in. */
  artifacts?: ArtifactOptions;
  store?: AgentStore;
  className?: string;
  disabled?: boolean;
  showReasoning?: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  suggestions?: readonly string[];
  placeholder?: string;
  /** Reports whether this chat currently has an active agent run. */
  onActivityChange?: (active: boolean) => void;
  /** Labels each tool’s risk on approval cards; unlabelled tools show none. */
  toolRisk?: (toolName: string) => ToolRisk | undefined;
  /** Set to the server’s `approvalTtlMs` so approvals count down and expire. */
  approvalTtlMs?: number;
}
