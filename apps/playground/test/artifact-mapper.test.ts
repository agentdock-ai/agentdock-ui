import { expect, it } from "vitest";
import { playgroundArtifactMapper } from "../src/adapter/artifact-mapper.js";
import type { RenderTool } from "@agentdock-ai/ui-core";
const tool: RenderTool = {
  toolCallId: "f",
  name: "create_file",
  status: "complete",
  input: { path: "index.html", content: "<h1>Hello</h1>" },
  progress: [],
};
it("maps file creates, complete updates and read outputs conservatively", () => {
  for (const name of ["create_file", "update_file"])
    expect(playgroundArtifactMapper({ ...tool, name })).toMatchObject({
      id: "index.html",
      content: "<h1>Hello</h1>",
    });
  for (const output of [
    "read text",
    { content: "read text" },
    JSON.stringify({ content: "read text" }),
  ])
    expect(
      playgroundArtifactMapper({ ...tool, name: "read_file", output })?.content,
    ).toBe("read text");
  expect(
    playgroundArtifactMapper({ ...tool, name: "read_file", output: '{"a":1}' })
      ?.content,
  ).toBe('{"a":1}');
  for (const input of [
    { ...tool, status: "failed" as const },
    { ...tool, name: "run_command" },
    { ...tool, name: "read_file" },
    { ...tool, name: "read_file", input: { path: 4 }, output: "text" },
    { ...tool, name: "read_file", output: { content: 4 } },
  ])
    expect(playgroundArtifactMapper(input)).toBeUndefined();
});
