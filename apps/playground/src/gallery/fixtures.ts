import { AgentStore, type ChatAttachmentAdapter } from "@agentdock-ai/react";
import type {
  RenderApproval,
  RenderMessageItem,
  RenderModel,
} from "@agentdock-ai/ui-core";
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
// Standalone component sample; transcript tool output is projected as tool cards.
export const toolMessage: RenderMessageItem = {
  id: "tool-output:0",
  messageId: "tool-output",
  runId: null,
  phaseId: null,
  position: 0,
  type: "message",
  role: "tool",
  state: "complete",
  blocks: [
    {
      id: "tool-output:0:block-0",
      position: 0,
      state: "complete",
      type: "text",
      text: "Tool input failed.\n    at Tool.call (file:///private/runtime.js:10:1)",
    },
  ],
};
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
  { id: "design", title: "A simple chat interface", isRunning: true },
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

const pendingApproval = {
  kind: "tool-approval",
  title: "Your approval is needed",
  detail: "The agent wants to run a command.",
  state: "pending",
  decisions: [],
} as const;
export const singleApproval: RenderApproval = {
  ...pendingApproval,
  interruptId: "single",
  actions: [
    {
      id: "single:command",
      label: "run_command",
      description: "Run a shell command",
      allowedDecisions: ["approve", "reject"],
      input: { command: "npm run build && npm test", cwd: "/workspace" },
    },
  ],
};
export const batchApproval: RenderApproval = {
  ...pendingApproval,
  interruptId: "batch",
  detail: "The agent wants to change two files.",
  actions: [
    {
      id: "batch:write",
      label: "write_file",
      description: "Writes a file in the workspace",
      input: { path: "src/config.ts", content: "export const retries = 3;\n" },
    },
    {
      id: "batch:delete",
      label: "delete_file",
      description: "Deletes a path",
      allowedDecisions: ["approve", "reject"],
      input: { path: "build/cache" },
    },
  ],
};
export const toolRisk = (name: string) =>
  name === "run_command" || name === "delete_file"
    ? ("high" as const)
    : name === "write_file" || name === "edit_file"
      ? ("medium" as const)
      : name === "read_file"
        ? ("low" as const)
        : undefined;

const customInterrupt = (
  interruptId: string,
  detail: string,
  responseSchema?: RenderApproval["responseSchema"],
  payload?: RenderApproval["payload"],
): RenderApproval => ({
  interruptId,
  kind: "custom",
  title: "Your input is needed",
  detail,
  state: "pending",
  decisions: [],
  actions: [],
  ...(responseSchema === undefined ? {} : { responseSchema }),
  ...(payload === undefined ? {} : { payload }),
});
export const interrupts = {
  choice: customInterrupt("choice", "Which environment should I deploy to?", {
    oneOf: [
      {
        const: "staging",
        title: "Staging",
        description: "Safe to test. Rebuilt every night.",
      },
      {
        const: "production",
        title: "Production",
        description: "Live for customers.",
      },
      {
        const: "preview",
        title: "Preview",
        description: "A temporary link for this branch.",
      },
    ],
  }),
  confirm: customInterrupt(
    "confirm",
    "Migrate the orders table to the new schema?",
    { type: "boolean" },
  ),
  text: customInterrupt(
    "text",
    "What should the release notes say about this change?",
    { type: "string", maxLength: 500 },
  ),
  form: customInterrupt("form", "Who should review this pull request?", {
    type: "object",
    required: ["reviewer"],
    properties: {
      reviewer: { type: "string", format: "email", title: "Reviewer email" },
      priority: { title: "Priority", enum: ["Normal", "High", "Low"] },
      notify: { type: "boolean", title: "Notify the team channel" },
    },
  }),
  fallback: customInterrupt(
    "fallback",
    "The agent asked for a PDF upload.",
    undefined,
    { type: "file_upload", accept: ["application/pdf"], maxBytes: 10485760 },
  ),
};
