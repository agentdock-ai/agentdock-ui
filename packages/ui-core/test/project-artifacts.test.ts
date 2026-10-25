import { expect, it } from "vitest";
import {
  projectArtifacts,
  type RenderModel,
  type RenderToolCallItem,
} from "../src/index.js";
const item = (
  id: string,
  path: string,
  content: string,
): RenderToolCallItem => ({
  id,
  type: "tool-call",
  runId: null,
  phaseId: null,
  position: 0,
  active: false,
  tool: {
    toolCallId: id,
    name: "write_file",
    input: { path, content },
    progress: [],
    status: "complete",
    completedAt: "now",
  },
});
const a = item("a", "a.txt", "first"),
  b = item("b", "b.json", "{}"),
  c = item("c", "a.txt", "second");
const model: RenderModel = {
  streamStatus: "closed",
  turns: [
    {
      id: "t",
      runId: null,
      sessionId: null,
      state: "completed",
      usage: null,
      limit: null,
      finishReason: null,
      cancellationReason: null,
      items: [
        a,
        { ...b, type: "tool-timeline", tools: [b, c] },
        a,
        { ...b, tool: { ...b.tool, status: "failed" } },
        {
          id: "e",
          type: "error",
          position: 0,
          runId: null,
          phaseId: null,
          error: {
            scope: "run",
            title: "Error",
            detail: "x",
            retryable: false,
          },
        },
      ],
    },
  ],
};
it("groups versions in stable file order and walks tool groups", () => {
  const result = projectArtifacts(model);
  expect(result.map((a) => a.id)).toEqual(["a.txt", "b.json"]);
  expect(result[0].content).toBe("second");
  expect(result[0].versions.map((v) => v.content)).toEqual(["first", "second"]);
  expect(result[0].versions[1]).toMatchObject({
    version: 2,
    toolCallId: "c",
    updatedAt: "now",
  });
  expect(projectArtifacts({ turns: [], streamStatus: "idle" })).toEqual([]);
});
it("supports custom mappers and skipped tools", () => {
  expect(projectArtifacts(model, () => undefined)).toEqual([]);
  expect(
    projectArtifacts(model, (t) => ({
      id: "custom",
      title: t.name,
      url: "https://example.com",
    }))[0],
  ).toMatchObject({
    kind: "link",
    versions: [{ version: 1 }, { version: 2 }, { version: 3 }],
  });
});
