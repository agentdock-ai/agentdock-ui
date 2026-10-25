import { expect, it } from "vitest";
import { defaultArtifactMapper, type RenderTool } from "../src/index.js";
const tool: RenderTool = {
  toolCallId: "1",
  name: "write_file",
  status: "complete",
  progress: [],
  input: { path: "src/a.ts", content: "hello" },
};
it("maps only successful tools with full path and content", () => {
  expect(defaultArtifactMapper(tool)).toEqual({
    id: "src/a.ts",
    title: "a.ts",
    content: "hello",
  });
  expect(
    defaultArtifactMapper({ ...tool, input: { path: "/", content: "" } })
      ?.title,
  ).toBe("/");
  for (const status of ["running", "failed", "approval"] as const)
    expect(defaultArtifactMapper({ ...tool, status })).toBeUndefined();
  const inputs: RenderTool["input"][] = [
    {},
    { path: "" },
    { path: "a" },
    { path: 1, content: "x" },
    { path: "a", content: 1 },
  ];
  for (const input of inputs)
    expect(defaultArtifactMapper({ ...tool, input })).toBeUndefined();
});
