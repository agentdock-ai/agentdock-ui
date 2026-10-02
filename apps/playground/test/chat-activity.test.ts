import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentStore, type ChatAdapter } from "@agentdock-ai/react";
import { Chat } from "../src/components/agentdock-ui/chat";
import { ToolTimeline } from "../src/components/agentdock-ui/tool-timeline";
import { StreamingText } from "../src/components/agentdock-ui/streaming-text";
import {
  createPreviewStore,
  runningTools,
  tools,
} from "../src/gallery/fixtures";
import { scenarios, sequence } from "../../../scripts/fixtures/events";

const adapter: ChatAdapter = { async *sendMessage() {} };
const renderChat = (store: AgentStore, chatAdapter = adapter) =>
  renderToStaticMarkup(createElement(Chat, { store, adapter: chatAdapter }));

describe("visible chat activity", () => {
  it("shows a usable continuation capability for a static pause", () => {
    const store = new AgentStore();
    sequence([
      { type: "run.started" },
      { type: "run.paused", next: ["node"] },
    ]).forEach((event) => store.applyEvent(event));
    store.setStreamStatus("closed");
    const html = renderChat(store, { ...adapter, async *continueRun() {} });
    expect(html).toContain("Continue run");
    expect(html).toContain("Continue when you’re ready");
    expect(renderChat(store)).toContain("Continue it in your app");
    expect(renderChat(store)).not.toContain(">Continue run</button>");
  });
  it("keeps approval waiting distinct from continuation", () => {
    const store = new AgentStore();
    scenarios.approval.forEach((event) => store.applyEvent(event));
    store.setStreamStatus("closed");
    expect(
      renderChat(store, { ...adapter, async *continueRun() {} }),
    ).not.toContain("Continue run");
  });
  it("renders streaming text without the scrollbar-shaped dash", () => {
    const html = renderToStaticMarkup(
      createElement(StreamingText, {
        text: "Let me create the files.",
        active: true,
      }),
    );
    expect(html).toContain("Let me create the files.");
    expect(html).toContain('data-streaming="true"');
    expect(html).not.toContain("animate-pulse");
  });

  it("shows running tool names and progress without expanding the group", () => {
    const html = renderToStaticMarkup(
      createElement(ToolTimeline, { tools: runningTools }),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("read_file Running");
    expect(html).toContain("src/app.tsx");
    expect(html).toContain("src/theme.css");
    expect(html).toContain("Reading the component source…");
  });

  it("keeps completed groups compact and inspectable", () => {
    const html = renderToStaticMarkup(createElement(ToolTimeline, { tools }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("ran");
    expect(html).not.toContain("Reading the component source…");
  });

  it("keeps working visible after answer text arrives without inventing tool activity", () => {
    const store = createPreviewStore("streaming");
    store.setStreamStatus("consuming");
    const html = renderChat(store);
    expect(html).toContain(">working</span>");
    expect(html).not.toContain("read_file");
  });

  it("shows tools instead of a generic working label during execution", () => {
    const store = createPreviewStore(
      "tools",
      scenarios.tools.findIndex((event) => event.type === "tool.completed"),
    );
    store.setStreamStatus("consuming");
    const html = renderChat(store);
    expect(html).toContain("read_file Running");
    expect(html).toContain("Reading the component source…");
    expect(html).not.toContain(">working</span>");
  });

  it("removes the working indicator after the run completes", () => {
    expect(renderChat(createPreviewStore())).not.toContain(">working</span>");
  });
});
