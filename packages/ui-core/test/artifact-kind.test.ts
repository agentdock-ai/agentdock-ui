import { expect, it } from "vitest";
import { artifactKind, codeLanguage } from "../src/index.js";
it("detects file extensions, MIME types, URL suffixes and unknowns", () => {
  for (const [path, kind] of [
    ["index.HTML", "html"],
    ["notes.md", "markdown"],
    ["a.json", "json"],
    ["a.csv", "csv"],
    ["a.tsv", "csv"],
    ["photo.svg", "image"],
    ["doc.pdf", "pdf"],
    ["app.ts", "code"],
    ["a.txt", "text"],
    ["a.bin", "file"],
  ])
    expect(artifactKind(path)).toBe(kind);
  for (const [mime, kind] of [
    ["image/png", "image"],
    ["text/html", "html"],
    ["application/json; charset=utf-8", "json"],
    ["text/plain", "text"],
    ["application/javascript", "code"],
    ["application/octet-stream", "file"],
  ])
    expect(artifactKind(undefined, mime)).toBe(kind);
  expect(
    artifactKind(undefined, undefined, "https://example.com/a.pdf?v=2"),
  ).toBe("pdf");
  expect(artifactKind("", undefined, "https://example.com")).toBe("link");
  expect(artifactKind()).toBe("file");
  expect(artifactKind("README", "")).toBe("file");
  expect(codeLanguage("A.TSX")).toBe("typescript");
  expect(codeLanguage()).toBeUndefined();
});
