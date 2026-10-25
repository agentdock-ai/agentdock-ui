import { expect, it } from "vitest";
import { parseArtifactJson, jsonTree, visibleJsonNodes } from "../src/index.js";
it("parses JSON without evaluating it and bounds tree expansion", () => {
  expect(parseArtifactJson("bad").ok).toBe(false);
  expect(parseArtifactJson("null")).toEqual({ ok: true, value: null });
  const tree = jsonTree({ a: [1, { b: "text" }], empty: {}, nothing: null });
  expect(tree.truncated).toBe(false);
  expect(visibleJsonNodes(tree.nodes, new Set())).toHaveLength(1);
  expect(visibleJsonNodes(tree.nodes, new Set(["0"]))).toHaveLength(4);
  expect(
    visibleJsonNodes(tree.nodes, new Set(tree.nodes.map((n) => n.id))),
  ).toHaveLength(tree.nodes.length);
  expect(jsonTree(Array(6000).fill(1)).nodes).toHaveLength(5000);
  expect(jsonTree([1, 2], 1).truncated).toBe(true);
  expect(jsonTree(1, 0)).toEqual({ nodes: [], truncated: true });
  let deep: unknown = 1;
  for (let i = 0; i < 70; i++) deep = { nested: deep };
  expect(jsonTree(deep).truncated).toBe(true);
});
