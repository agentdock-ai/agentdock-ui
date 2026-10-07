import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConversationHistory,
  ConversationThread,
} from "@agentdock-ai/contracts";
import type { ConversationClient } from "./conversation-client.js";

export interface ConversationHookState {
  threads: ConversationThread[];
  selectedThread: ConversationThread | null;
  history: ConversationHistory | null;
  loading: boolean;
  hasMoreThreads: boolean;
  error: string | null;
  refresh(): Promise<void>;
  loadMoreThreads(): Promise<void>;
  loadOlderHistory(): Promise<void>;
  refreshHistory(threadId?: string): Promise<void>;
  create(title?: string): Promise<ConversationThread>;
  rename(threadId: string, title: string): Promise<void>;
  select(threadId: string): Promise<void>;
}

/** Owns history request cancellation and rejects late results from an older selection. */
export function useConversations(
  client: ConversationClient,
): ConversationHookState {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] =
    useState<ConversationThread | null>(null);
  const [history, setHistory] = useState<ConversationHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const threadCursor = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const selectedId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await client.listThreads();
      threadCursor.current = result.nextCursor;
      setHasMoreThreads(Boolean(result.nextCursor));
      setThreads((current) => {
        const latest = new Map(current.map((thread) => [thread.id, thread]));
        for (const thread of result.threads) latest.set(thread.id, thread);
        return result.threads.map((thread) => latest.get(thread.id)!);
      });
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load conversations.",
      );
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const loadMoreThreads = useCallback(async () => {
    const cursor = threadCursor.current;
    if (!cursor) return;
    const result = await client.listThreads(undefined, cursor);
    threadCursor.current = result.nextCursor;
    setHasMoreThreads(Boolean(result.nextCursor));
    setThreads((current) => {
      const byId = new Map(current.map((thread) => [thread.id, thread]));
      for (const thread of result.threads) byId.set(thread.id, thread);
      return [...byId.values()];
    });
  }, [client]);

  const select = useCallback(
    async (threadId: string) => {
      selectedId.current = threadId;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const currentSelection = ++selection.current;
      setLoading(true);
      setError(null);
      try {
        const result = await client.getHistory(threadId, controller.signal);
        if (selection.current !== currentSelection || controller.signal.aborted)
          return;
        const thread = result.thread;
        setSelectedThread(thread);
        setHistory(result);
        setThreads((current) =>
          current.map((item) => (item.id === thread.id ? thread : item)),
        );
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load conversation.",
        );
      } finally {
        if (selection.current === currentSelection) setLoading(false);
      }
    },
    [client],
  );

  const loadOlderHistory = useCallback(async () => {
    const currentHistory = history;
    const threadId = selectedThread?.id;
    if (!currentHistory?.nextCursor || !threadId) return;
    const currentSelection = selection.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    try {
      const older = await client.getHistory(
        threadId,
        controller.signal,
        currentHistory.nextCursor,
      );
      if (controller.signal.aborted || selection.current !== currentSelection)
        return;
      const messages = new Map<number, (typeof older.messages)[number]>();
      for (const message of [...older.messages, ...currentHistory.messages])
        messages.set(message.position, message);
      setHistory({
        ...currentHistory,
        messages: [...messages.values()].sort(
          (a, b) => a.position - b.position,
        ),
        nextCursor: older.nextCursor,
      });
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load earlier messages.",
        );
    }
  }, [client, history, selectedThread?.id]);

  const refreshHistory = useCallback(
    async (threadId = selectedThread?.id) => {
      if (!threadId || selectedId.current !== threadId) return;
      const currentSelection = selection.current;
      try {
        const result = await client.getHistory(threadId);
        if (
          selection.current !== currentSelection ||
          selectedId.current !== threadId
        )
          return;
        setHistory(result);
        setSelectedThread(result.thread);
        setThreads((current) =>
          current.map((thread) =>
            thread.id === threadId ? result.thread : thread,
          ),
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not refresh conversation state.",
        );
      }
    },
    [client, selectedThread?.id],
  );

  const create = useCallback(
    async (title?: string) => {
      const thread = await client.createThread(title);
      setThreads((current) => [
        thread,
        ...current.filter((item) => item.id !== thread.id),
      ]);
      await select(thread.id);
      return thread;
    },
    [client, select],
  );

  const rename = useCallback(
    async (threadId: string, title: string) => {
      const thread = await client.renameThread(threadId, title);
      setThreads((current) =>
        current.map((item) => (item.id === threadId ? thread : item)),
      );
      setSelectedThread((current) =>
        current?.id === threadId ? thread : current,
      );
    },
    [client],
  );

  useEffect(() => {
    void refresh().catch(() => undefined);
    return () => {
      selection.current += 1;
      request.current?.abort();
    };
  }, [refresh]);

  return {
    threads,
    selectedThread,
    history,
    loading,
    hasMoreThreads,
    error,
    refresh,
    loadMoreThreads,
    loadOlderHistory,
    refreshHistory,
    create,
    rename,
    select,
  };
}
