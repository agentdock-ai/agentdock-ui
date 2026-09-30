import React from "react";
import { createRoot } from "react-dom/client";
import { AgentChatView, AgentDockTheme } from "@agentdock-ai/react/components";
import { AgentProvider, AgentStore } from "@agentdock-ai/react";
import { scenarios, type Scenario } from "../../../scripts/fixtures/events.js";
import "@agentdock-ai/react/styles.css";
import "./theme.css";
const params = new URLSearchParams(location.search);
const name = (params.get("scenario") ?? "empty") as Scenario;
const store = new AgentStore();
if (name !== "empty")
  store.appendUserMessage("Help me design a calm, focused chat interface.");
(scenarios[name] ?? []).forEach((event) => store.applyEvent(event));
createRoot(document.getElementById("root")!).render(
  <AgentDockTheme mode="light">
    <div style={{ height: "100dvh", padding: 24 }}>
      <AgentProvider store={store}>
        <AgentChatView onSubmit={() => {}} />
      </AgentProvider>
    </div>
  </AgentDockTheme>,
);
