// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { TaggedContent } from "../../../apps/registry/registry/agentdock-ui/tagged-content.js";
import { Message } from "../../../apps/registry/registry/agentdock-ui/message.js";
import type { RenderMessageItem } from "@agentdock-ai/ui-core";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("extracts charts around Markdown and preserves code examples and non-assistant text", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const chart =
    '<chart type="bar">\n{"x":["Jan"],"series":[{"name":"Sales","data":[12]}]}\n</chart>';
  await act(async () =>
    root.render(
      <TaggedContent
        text={`**Before**\n${chart}\nAfter\n\n\`\`\`html\n${chart}\n\`\`\``}
      />,
    ),
  );
  expect(host.querySelector("strong")?.textContent).toBe("Before");
  expect(host.querySelectorAll('[role="img"]')).toHaveLength(1);
  expect(host.querySelector("code")?.textContent).toContain("<chart");
  const message: RenderMessageItem = {
    id: "m",
    messageId: "m",
    type: "message",
    role: "assistant",
    runId: null,
    phaseId: null,
    position: 0,
    state: "complete",
    blocks: [
      { id: "b", position: 0, state: "complete", type: "text", text: chart },
    ],
  };
  await act(async () =>
    root.render(<Message message={message} showReasoning />),
  );
  expect(host.querySelector('[role="img"]')).not.toBeNull();
  await act(async () =>
    root.render(
      <Message message={{ ...message, role: "user" }} showReasoning />,
    ),
  );
  expect(host.querySelector('[role="img"]')).toBeNull();
  expect(host.textContent).toContain("<chart");
  await act(async () => root.unmount());
});
