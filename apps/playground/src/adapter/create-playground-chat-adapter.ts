import { decodeAgentEventStream, type ChatAdapter } from "@agentdock-ai/react";
import { playgroundAttachmentPolicy } from "./attachment-policy.js";

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
    sendMessage: ({ text, attachments, signal }) =>
      stream(
        {
          prompt: text,
          ...(attachments?.length
            ? { attachmentIds: attachments.map((item) => item.id) }
            : {}),
        },
        signal,
      ),
    attachments: {
      ...playgroundAttachmentPolicy,
      async upload({ file, signal }) {
        const response = await request(
          `/api/attachments?threadId=${encodeURIComponent(threadId)}`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
              "X-File-Name": encodeURIComponent(file.name),
            },
            body: file,
            signal,
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || "The file could not be uploaded.");
        }
        const item = (await response.json()) as {
          id: string;
          name: string;
          size: number;
          mimeType: string;
        };
        if (!item.id || !item.name || typeof item.size !== "number")
          throw new Error("The upload could not be confirmed.");
        const url = new URL(
          `/api/attachments/${encodeURIComponent(item.id)}?threadId=${encodeURIComponent(threadId)}`,
          window.location.origin,
        ).href;
        return {
          id: item.id,
          name: item.name,
          size: item.size,
          content: item.mimeType.startsWith("image/")
            ? { type: "image", fileId: item.id, url, mimeType: item.mimeType }
            : {
                type: "file",
                fileId: item.id,
                name: item.name,
                url,
                mimeType: item.mimeType,
              },
        };
      },
    },
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
