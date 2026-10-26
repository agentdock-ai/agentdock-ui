import { expect, it } from "vitest";
import { formatArtifactJson, ARTIFACT_INLINE_BYTES } from "../src/index.js";
it("pretty prints bounded JSON and keeps unsafe formatting as original source", () => {
  expect(formatArtifactJson('{"answer":42}', { answer: 42 })).toBe(
    '{\n  "answer": 42\n}',
  );
  const deep = "[".repeat(20000) + "0" + "]".repeat(20000);
  expect(formatArtifactJson(deep, JSON.parse(deep))).toBe(deep);
  const wide = JSON.stringify(Array.from({ length: 5001 }, () => 0));
  expect(formatArtifactJson(wide, JSON.parse(wide))).toBe(wide);
  const large = { value: "x".repeat(ARTIFACT_INLINE_BYTES) };
  expect(formatArtifactJson("original", large)).toBe("original");
  expect(formatArtifactJson("original", undefined)).toBe("original");
  expect(formatArtifactJson("original", 1n)).toBe("original");
});
