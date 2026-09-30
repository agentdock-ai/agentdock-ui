import type { AgentEvent, JsonValue } from "@agentdock-ai/ui-core";

/**
 * The event stream supplied by an application's ChatAdapter.
 *
 * The application owns how the stream is authenticated, requested, decoded,
 * and authorized. The UI consumes canonical AgentDock events only.
 */
export type AgentEventStream = AsyncIterable<AgentEvent>;

/**
 * App-owned bridge between a copied Chat component and existing application
 * APIs. This type intentionally has no endpoint, credentials, or request-body
 * fields because those concerns belong in the application.
 */
export interface ChatAdapter {
  sendMessage(input: { text: string; signal: AbortSignal }): AgentEventStream;

  cancelRun?(input: { runId: string; signal: AbortSignal }): Promise<void>;

  respondToInterrupt?(input: {
    runId: string;
    interruptId: string;
    decisions: readonly JsonValue[];
    signal: AbortSignal;
  }): AgentEventStream;
}
