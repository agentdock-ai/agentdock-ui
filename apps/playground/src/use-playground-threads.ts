import { useCallback, useMemo, useState } from "react";
import { AgentStore, type ChatAdapter } from "@agentdock-ai/react";
import { createPlaygroundChatAdapter } from "./adapter/create-playground-chat-adapter.js";
function newThread() {
  const id = `playground-${crypto.randomUUID()}`;
  return {
    id,
    title: "New chat",
    store: new AgentStore(),
    adapter: createPlaygroundChatAdapter({ threadId: id }),
  };
}
/** Demo thread collection belongs to this app; replace with the host's authorized persistence. */
export function usePlaygroundThreads() {
  const [threads, setThreads] = useState(() => [newThread()]);
  const [selectedId, setSelectedId] = useState(threads[0]!.id);
  const active = threads.find((thread) => thread.id === selectedId)!;
  const onActivityChange = useCallback(
    (isRunning: boolean) => {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === active.id ? { ...thread, isRunning } : thread,
        ),
      );
    },
    [active.id],
  );
  const adapter = useMemo<ChatAdapter>(
    () => ({
      ...active.adapter,
      sendMessage(request) {
        setThreads((current) =>
          current.map((thread) =>
            thread.id === active.id && thread.title === "New chat"
              ? {
                  ...thread,
                  title: (
                    request.text.trim() ||
                    request.attachments?.[0]?.name ||
                    "New chat"
                  ).slice(0, 64),
                }
              : thread,
          ),
        );
        return active.adapter.sendMessage(request);
      },
    }),
    [active.id, active.adapter],
  );
  return {
    threads,
    active,
    adapter,
    onActivityChange,
    onSelect: setSelectedId,
    onNew() {
      const thread = newThread();
      setThreads((current) => [thread, ...current]);
      setSelectedId(thread.id);
    },
  };
}
