import { createFixtureChatAdapter } from "./adapter/create-fixture-chat-adapter.js";
import type { Scenario } from "../../../scripts/fixtures/events.js";
import { useCallback, useMemo, useState } from "react";
import { AgentStore, type ChatAdapter } from "@agentdock-ai/react";
import { createPlaygroundChatAdapter } from "./adapter/create-playground-chat-adapter.js";
function newThread(scenario?: Scenario) {
  const id = `playground-${crypto.randomUUID()}`;
  const store = new AgentStore();
  return {
    id,
    scenario,
    title: "New chat",
    store,
    adapter: scenario
      ? createFixtureChatAdapter(store, scenario)
      : createPlaygroundChatAdapter({ threadId: id }),
  };
}
/** Demo thread collection belongs to this app; replace with the host's authorized persistence. */
export function usePlaygroundThreads(scenario?: Scenario) {
  const [threads, setThreads] = useState(() => [newThread(scenario)]);
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
  function add(nextScenario = scenario) {
    const thread = newThread(nextScenario);
    setThreads((current) => [thread, ...current]);
    setSelectedId(thread.id);
  }
  return {
    threads,
    active,
    adapter,
    onActivityChange,
    onSelect: setSelectedId,
    onNew: () => add(),
    onScenario: (next: Scenario) => add(next),
  };
}
