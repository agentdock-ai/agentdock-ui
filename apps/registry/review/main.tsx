import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AgentStore } from "@agentdock-ai/react";
import { Chat } from "../registry/agentdock-ui/chat.js";
import { ChatWorkspace } from "../registry/agentdock-ui/chat-workspace.js";
import { ThreadSidebar } from "../registry/agentdock-ui/thread-sidebar.js";
import {
  scenarios,
  sequence,
  text,
  intro,
  type Scenario,
} from "../../../scripts/fixtures/events.js";
import { createFixtureChatAdapter } from "../../playground/src/adapter/create-fixture-chat-adapter.js";
import "./theme.css";
const params = new URLSearchParams(location.search);
function makeThread(scenario: Scenario, title: string) {
  const store = new AgentStore();
  if (scenario !== "empty")
    store.appendUserMessage("Help me design a calm, focused chat interface.");
  (scenarios[scenario] ?? []).forEach((event) => store.applyEvent(event));
  if (["streaming", "reasoning", "thinking"].includes(scenario))
    store.setStreamStatus("consuming");
  return {
    id: crypto.randomUUID(),
    title,
    scenario,
    store,
    adapter: createFixtureChatAdapter(store, scenario),
  };
}
function Review() {
  const [threads, setThreads] = useState(() => [
    makeThread((params.get("scenario") ?? "empty") as Scenario, "New chat"),
    makeThread("conversation", "Greeting"),
    makeThread("tools", "Component review"),
  ]);
  const [selectedId, setSelectedId] = useState<string>(threads[0]!.id);
  const active = threads.find((thread) => thread.id === selectedId)!;
  const [dark, setDark] = useState(params.get("theme") !== "light");
  const [hideReasoning, setHideReasoning] = useState(false);
  const name = active.scenario;
  const adapter = useMemo(() => {
    const value = active.adapter;
    const sendMessage: typeof value.sendMessage = (request) => {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === active.id && thread.title === "New chat"
            ? { ...thread, title: request.text.slice(0, 64) }
            : thread,
        ),
      );
      return value.sendMessage(request);
    };
    return params.get("capabilities") === "send-only"
      ? { sendMessage }
      : { ...value, sendMessage };
  }, [active.id, active.adapter]);
  function newThread() {
    const thread = makeThread("empty", "New chat");
    setThreads((current) => [thread, ...current]);
    setSelectedId(thread.id);
  }
  function selectScenario(scenario: Scenario) {
    const thread = makeThread(scenario, "New chat");
    setThreads((current) =>
      current.map((item) => (item.id === selectedId ? thread : item)),
    );
    setSelectedId(thread.id);
  }
  function advance() {
    const agent = active.store.getSnapshot().agent;
    if (agent.status !== "running") return;
    const inputs = agent.messages.some(
      (message) => message.messageId === "answer",
    )
      ? []
      : intro.slice(1);
    sequence(
      [
        ...inputs,
        text(
          "\n\n" +
            "A longer streamed paragraph keeps the viewport behavior observable. ".repeat(
              120,
            ),
        ),
      ],
      agent.runId!,
      "phase-1",
      agent.lastLogicalSequence,
    ).forEach((event) => active.store.applyEvent(event));
  }
  return (
    <div
      className={`${dark ? "dark " : ""}h-dvh bg-background p-2 text-foreground`}
    >
      <ChatWorkspace
        title={active.title}
        sidebar={
          <ThreadSidebar
            threads={threads}
            selectedId={selectedId}
            onNew={newThread}
            onSelect={setSelectedId}
            footer="UI preview"
          />
        }
        actions={
          <>
            <select
              aria-label="Scenario"
              value={name}
              onChange={(event) =>
                selectScenario(event.target.value as Scenario)
              }
              className="h-7 max-w-28 rounded-md border border-border bg-background px-2 text-xs"
            >
              {Object.keys(scenarios).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            {["streaming", "reasoning", "thinking"].includes(name) && (
              <button
                className="min-h-7 rounded-md px-2 text-xs hover:bg-muted"
                onClick={advance}
              >
                Advance stream
              </button>
            )}
            <label className="hidden items-center gap-1.5 text-xs sm:flex">
              <input
                type="checkbox"
                checked={hideReasoning}
                onChange={(event) => setHideReasoning(event.target.checked)}
              />
              Hide reasoning
            </label>
            <button
              className="min-h-7 rounded-md px-2 text-xs hover:bg-muted"
              onClick={() => setDark(!dark)}
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
          </>
        }
      >
        <Chat
          key={active.id}
          adapter={adapter}
          store={active.store}
          showReasoning={!hideReasoning}
          suggestions={[
            "Help me plan my week",
            "Explain a concept",
            "Review an idea",
          ]}
        />
      </ChatWorkspace>
    </div>
  );
}
if (params.has("baseline")) void import("./baseline.js");
else {
  const root =
    import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
  if (import.meta.hot) import.meta.hot.data.root = root;
  root.render(
    <React.StrictMode>
      <Review />
    </React.StrictMode>,
  );
}
