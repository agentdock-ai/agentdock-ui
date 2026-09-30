import { decodeAgentEventStream, type ChatAdapter } from "@agentdock-ai/react";

/** The playground owns identity, credentials, URLs and request construction. */
export function createPlaygroundChatAdapter({
  threadId,
  request = fetch,
}: {
  threadId: string;
  request?: typeof fetch;
}): ChatAdapter {
  async function* stream(body: Record<string, unknown>, signal: AbortSignal) {
    const response = await request("/api/agent/stream", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, threadId }),
      signal,
    });
    if (!response.ok || !response.body)
      throw new Error("The agent request could not be started.");
    yield* decodeAgentEventStream(response.body, { signal });
  }
  return {
    sendMessage: ({ text, signal }) => stream({ prompt: text }, signal),
    respondToInterrupt: ({ runId, interruptId, decisions, signal }) =>
      stream({ runId, interruptId, decisions }, signal),
    async cancelRun({ runId, signal }) {
      const response = await request("/api/agent/cancel", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, runId }),
        signal,
      });
      if (!response.ok) throw new Error("Cancellation could not be confirmed.");
    },
  };
}
