import {
  cloneConversationEventEnvelope,
  cloneConversationAttachment,
  cloneConversationHistory,
  cloneConversationThreadPage,
  assertConversationThread,
  type AgentEvent,
  type ConversationHistory,
  type ConversationThread,
  type ConversationThreadPage,
} from "@agentdock-ai/contracts";
import type { ChatAdapter, ChatAttachment } from "./chat-adapter.js";

export interface ConversationClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getThreadId(): string | null;
  onThreadsChanged?(threads: readonly ConversationThread[]): void;
  onOperationSettled?(threadId: string): void;
}

export interface ConversationClient {
  adapter: ChatAdapter;
  listThreads(
    signal?: AbortSignal,
    cursor?: string | null,
  ): Promise<ConversationThreadPage>;
  createThread(
    title?: string,
    signal?: AbortSignal,
  ): Promise<ConversationThread>;
  renameThread(
    threadId: string,
    title: string,
    signal?: AbortSignal,
  ): Promise<ConversationThread>;
  getHistory(
    threadId: string,
    signal?: AbortSignal,
    cursor?: string | null,
  ): Promise<ConversationHistory>;
}

/** Authenticated HTTP client; the supplied fetcher owns cookies/tokens and refresh policy. */
export function createConversationClient(
  options: ConversationClientOptions,
): ConversationClient {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
  const pendingOperationIds = new Map<string, string>();
  const activeOperationIds = new Map<string, string>();

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, init);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        result?.message ?? `Conversation request failed (${response.status}).`,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async function* stream(
    path: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
  ) {
    const operationId = crypto.randomUUID();
    const threadId = body.threadId;
    if (typeof threadId !== "string")
      throw new Error("Conversation stream requires a thread ID.");
    activeOperationIds.set(threadId, operationId);
    pendingOperationIds.set(threadId, operationId);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, operationId }),
        signal,
      });
    } catch (error) {
      if (activeOperationIds.get(threadId) === operationId)
        activeOperationIds.delete(threadId);
      options.onOperationSettled?.(threadId);
      throw error;
    }
    if (!response.ok || !response.body) {
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (activeOperationIds.get(threadId) === operationId)
        activeOperationIds.delete(threadId);
      throw new Error(result?.message ?? "The conversation request failed.");
    }
    try {
      for await (const event of readConversationEvents(response.body, signal, {
        threadId,
        operationId,
      })) {
        if (event.type === "run.completed" || event.type === "run.failed")
          if (pendingOperationIds.get(threadId) === operationId)
            pendingOperationIds.delete(threadId);
        yield event;
      }
    } finally {
      if (activeOperationIds.get(threadId) === operationId)
        activeOperationIds.delete(threadId);
      options.onOperationSettled?.(threadId);
    }
  }

  const adapter: ChatAdapter = {
    sendMessage({ text, attachments = [], signal }) {
      const threadId = requireThread();
      return stream(
        `/conversations/${encodeURIComponent(threadId)}/start`,
        {
          threadId,
          prompt: text,
          attachments: attachments.map((attachment) => attachment.id),
        },
        signal,
      );
    },
    async cancelRun({ signal }) {
      const threadId = requireThread();
      const activeOperationId = activeOperationIds.get(threadId);
      if (!activeOperationId)
        throw new Error("There is no active conversation operation.");
      await request(`/conversations/${encodeURIComponent(threadId)}/stop`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          targetOperationId: activeOperationId,
          threadId,
        }),
        signal,
      });
    },
    continueRun({ signal }) {
      const threadId = requireThread();
      const pendingOperationId = pendingOperationIds.get(threadId);
      if (!pendingOperationId)
        throw new Error("No native pending operation is available.");
      return stream(
        `/conversations/${encodeURIComponent(threadId)}/continue`,
        {
          threadId,
          pendingOperationId,
        },
        signal,
      );
    },
    respondToInterrupt({ interruptId, decisions, signal }) {
      const threadId = requireThread();
      return stream(
        `/conversations/${encodeURIComponent(threadId)}/approvals`,
        {
          threadId,
          interruptId,
          decisions,
        },
        signal,
      );
    },
    attachments: {
      accept: "image/png,image/jpeg,image/gif,image/webp",
      maxFiles: 4,
      maxFileSize: 5 * 1024 * 1024,
      async upload({ file, signal }): Promise<ChatAttachment> {
        const threadId = requireThread();
        const form = new FormData();
        form.set("file", file);
        const response = await fetcher(
          `${baseUrl}/conversations/${encodeURIComponent(threadId)}/attachments`,
          {
            method: "POST",
            body: form,
            signal,
          },
        );
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(result?.message ?? "The image upload failed.");
        }
        const result = cloneConversationAttachment(await response.json());
        if (result.threadId !== threadId)
          throw new Error(
            "Attachment response belongs to another conversation.",
          );
        return {
          ...result,
          content: {
            type: "image",
            url: result.url,
            mimeType: result.mimeType,
          },
        };
      },
    },
  };

  return {
    adapter,
    async listThreads(signal, cursor) {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const raw = await request<unknown>(`/conversations${query}`, { signal });
      const page = cloneConversationThreadPage(raw);
      options.onThreadsChanged?.(page.threads);
      return page;
    },
    async createThread(title, signal) {
      const result = await request<{ thread: ConversationThread }>(
        "/conversations",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(title ? { title } : {}),
          signal,
        },
      );
      assertConversationThread(result.thread);
      return structuredClone(result.thread);
    },
    async renameThread(threadId, title, signal) {
      const result = await request<{ thread: ConversationThread }>(
        `/conversations/${encodeURIComponent(threadId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title }),
          signal,
        },
      );
      assertConversationThread(result.thread);
      return structuredClone(result.thread);
    },
    async getHistory(threadId, signal, cursor) {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const raw = await request<unknown>(
        `/conversations/${encodeURIComponent(threadId)}/history${query}`,
        { signal },
      );
      const history = cloneConversationHistory(raw);
      if (history.thread.id !== threadId)
        throw new Error("History response belongs to another conversation.");
      if (
        history.execution &&
        (history.actions.canContinue || history.actions.canRespondToInterrupt)
      )
        pendingOperationIds.set(threadId, history.execution.operationId);
      else pendingOperationIds.delete(threadId);
      return history;
    },
  };

  function requireThread(): string {
    const threadId = options.getThreadId();
    if (!threadId) throw new Error("Select a conversation first.");
    return threadId;
  }
}

async function* readConversationEvents(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  expected: { threadId: string; operationId: string },
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = frame
          .split("\n")
          .find((part) => part.startsWith("data: "));
        if (line) {
          const envelope = cloneConversationEventEnvelope(
            JSON.parse(line.slice(6)),
          );
          if (
            envelope.threadId !== expected.threadId ||
            envelope.operationId !== expected.operationId
          )
            throw new Error(
              "Conversation stream identity did not match the request.",
            );
          yield envelope.event;
        }
        boundary = buffer.indexOf("\n\n");
      }
      if (signal.aborted) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
