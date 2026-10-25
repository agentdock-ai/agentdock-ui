import { AgentStore } from "@agentdock-ai/react";
import { artifactKind, type Artifact } from "@agentdock-ai/ui-core";
import { sequence, complete } from "../../../../scripts/fixtures/events";
export const artifactFixtures: Artifact[] = [
  [
    "index.html",
    "<!doctype html><html><head><style>body{font:16px system-ui;padding:32px;background:#f8fafc;color:#0f172a}h1{font-size:32px}</style></head><body><h1>Welcome</h1><p>A small landing page, made by your agent.</p></body></html>",
  ],
  [
    "notes.md",
    "# Release notes\n\n- Charts in answers\n- File previews\n- Voice drafts",
  ],
  ["data.json", '{"sales":[12,18,15],"currency":"USD","ready":true}'],
  ["report.csv", "Month,Sales\nJan,12\nFeb,18\nMar,15"],
  ["example.ts", "export const sales = [12, 18, 15];\nconsole.log(sales);"],
  ["readme.txt", "Search this file for sales.\nMonthly sales are ready."],
  ["archive.bin", "Binary fixture"],
].map(([id, content]) => ({
  id,
  title: id,
  kind: artifactKind(id),
  content,
  versions: [
    { version: 1, content, toolCallId: id },
    { version: 2, content, toolCallId: `${id}:2` },
  ],
}));
artifactFixtures.push(
  {
    id: "landscape.svg",
    title: "landscape.svg",
    kind: "image",
    url: "/gallery/landscape.svg",
    versions: [],
  },
  {
    id: "sample.pdf",
    title: "sample.pdf",
    kind: "pdf",
    url: "/gallery/sample.pdf",
    versions: [],
  },
  {
    id: "example",
    title: "example.com",
    kind: "link",
    url: "https://example.com",
    versions: [],
  },
);
export function createArtifactPreviewStore() {
  const store = new AgentStore();
  store.appendUserMessage("Create a landing page, then update its heading.");
  const original = {
    toolCallId: "file-1",
    name: "create_file",
    input: { path: "index.html", content: "<h1>Hello</h1>" },
  };
  const updated = {
    toolCallId: "file-2",
    name: "update_file",
    input: { path: "index.html", content: artifactFixtures[0].content ?? "" },
  };
  sequence([
    { type: "run.started" },
    { type: "tool.called", toolCall: original },
    { type: "tool.completed", result: { ...original, output: "Created" } },
    { type: "tool.called", toolCall: updated },
    { type: "tool.completed", result: { ...updated, output: "Updated" } },
    complete(
      "Your page now says Welcome. [View reference](https://example.com)",
    ),
  ]).forEach((e) => store.applyEvent(e));
  return store;
}
