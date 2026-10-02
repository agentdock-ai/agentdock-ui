import { AgentStore, type ChatAttachmentAdapter } from "@agentdock-ai/react";
import type { RenderMessageItem, RenderModel } from "@agentdock-ai/ui-core";
import { scenarios, type Scenario } from "../../../../scripts/fixtures/events";

export function createPreviewStore(
  scenario: Scenario = "conversation",
  eventCount?: number,
) {
  const store = new AgentStore();
  if (scenario !== "empty")
    store.appendUserMessage("Help me design a simple chat interface.");
  scenarios[scenario]
    .slice(0, eventCount)
    .forEach((event) => store.applyEvent(event));
  return store;
}

function findMessage(model: RenderModel, role: RenderMessageItem["role"]) {
  const message = model.turns
    .flatMap((turn) => turn.items)
    .find(
      (item): item is RenderMessageItem =>
        item.type === "message" && item.role === role,
    );
  if (!message) throw new Error(`Missing ${role} gallery fixture`);
  return message;
}

export const conversation = createPreviewStore().getSnapshot().renderModel;
export const userMessage = findMessage(conversation, "user");
export const assistantMessage = findMessage(conversation, "assistant");
export const toolMessage = findMessage(
  createPreviewStore("toolMessage").getSnapshot().renderModel,
  "tool",
);
function toolItems(store: AgentStore) {
  return store
    .getSnapshot()
    .renderModel.turns.flatMap((turn) => turn.items)
    .flatMap((item) =>
      item.type === "tool-timeline"
        ? [...item.tools]
        : item.type === "tool-call"
          ? [item]
          : [],
    );
}
export const tools = toolItems(createPreviewStore("tools"));
export const runningTools = toolItems(
  createPreviewStore(
    "tools",
    scenarios.tools.findIndex((event) => event.type === "tool.completed"),
  ),
);
export const approval = createPreviewStore("approval")
  .getSnapshot()
  .renderModel.turns.flatMap((turn) => turn.items)
  .find((item) => item.type === "approval")!.approval;

export const threads = [
  { id: "design", title: "A simple chat interface" },
  { id: "week", title: "Plan my week" },
  { id: "idea", title: "Review an idea" },
];
export const suggestions = [
  "Plan my week",
  "Explain a concept",
  "Review an idea",
];
export const reasoning =
  "First, I’ll check the message hierarchy. Then I’ll keep the composer compact and make tool activity easy to inspect.";

/** Gallery attachments stay local; only sample metadata is prepared. */
export const localAttachments: ChatAttachmentAdapter = {
  accept: "text/*,.md,.pdf,image/png,image/jpeg,image/webp",
  maxFiles: 5,
  maxFileSize: 5_000_000,
  async upload({ file, signal }) {
    signal.throwIfAborted();
    const id = crypto.randomUUID();
    return {
      id,
      name: file.name,
      size: file.size,
      content: file.type.startsWith("image/")
        ? { type: "image", fileId: id, mimeType: file.type }
        : { type: "file", fileId: id, name: file.name, mimeType: file.type },
    };
  },
};
