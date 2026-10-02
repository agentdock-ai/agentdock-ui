import type { AgentEvent, ContentPart, JsonValue } from "@agentdock-ai/ui-core";

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  /** Canonical display content; IDs and URLs are supplied by the consuming app. */
  content: Extract<ContentPart, { type: "file" | "image" | "audio" | "video" }>;
}

export interface ChatAttachmentAdapter {
  accept?: string;
  maxFiles?: number;
  maxFileSize?: number;
  upload(input: { file: File; signal: AbortSignal }): Promise<ChatAttachment>;
}

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
  sendMessage(input: {
    text: string;
    attachments?: readonly ChatAttachment[];
    signal: AbortSignal;
  }): AgentEventStream;

  /** Only expose this capability when the app can upload and send attachments. */
  attachments?: ChatAttachmentAdapter;

  cancelRun?(input: { runId: string; signal: AbortSignal }): Promise<void>;

  /** Continue a paused run with no pending interrupt; request construction stays in the app. */
  continueRun?(input: { runId: string; signal: AbortSignal }): AgentEventStream;

  respondToInterrupt?(input: {
    runId: string;
    interruptId: string;
    decisions: readonly JsonValue[];
    signal: AbortSignal;
  }): AgentEventStream;
}
