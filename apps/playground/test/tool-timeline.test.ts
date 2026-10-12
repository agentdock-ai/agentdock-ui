// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import type { RenderToolCallItem } from "@agentdock-ai/ui-core";
import { ToolTimeline } from "../src/components/agentdock-ui/tool-timeline";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("opens exactly three tool rows when the completed group is clicked", async () => {
  const tools: RenderToolCallItem[] = [
    "read_file",
    "list_files",
    "read_file",
  ].map((name, index) => ({
    id: `tool-${index}`,
    runId: "run",
    phaseId: null,
    position: index,
    type: "tool-call",
    active: false,
    tool: {
      toolCallId: `call-${index}`,
      name,
      input: {},
      output: "Done",
      progress: [],
      status: "complete",
    },
  }));
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(ToolTimeline, { tools })));
    const trigger = host.querySelector("button")!;
    expect(trigger.textContent).toBe("ran 3 tools");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelectorAll("button[aria-label]")).toHaveLength(0);
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      [...host.querySelectorAll("button[aria-label]")].map((tool) =>
        tool.getAttribute("aria-label"),
      ),
    ).toEqual([
      "read_file Complete",
      "list_files Complete",
      "read_file Complete",
    ]);
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelectorAll("button[aria-label]")).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
