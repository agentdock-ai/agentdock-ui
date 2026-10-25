import { expect, it } from "vitest";
import { parseTaggedBlocks } from "../src/index.js";
const parse = (text: string, streaming = false) =>
  parseTaggedBlocks(text, { streaming });
it("preserves ordinary Markdown and unknown or mid-sentence tags", () => {
  for (const text of [
    "hello",
    "A <chart> example",
    "<other>\n{}\n</other>",
    "`<chart>`",
    "<CHART>\n{}\n</CHART>",
    "<chart invalid<>",
  ])
    expect(parse(text)).toEqual([{ kind: "markdown", text }]);
  expect(parse("")).toEqual([]);
});
it("extracts ordered blocks with exact source and CRLF", () => {
  const raw = '  <chart type="bar">\r\n{}\r\n </chart>\r\n';
  const result = parse(`before\r\n${raw}between\n${raw}after`);
  expect(result.map((s) => s.kind)).toEqual([
    "markdown",
    "block",
    "markdown",
    "block",
    "markdown",
  ]);
  expect(result[1]).toMatchObject({
    tag: "chart",
    body: "{}\r\n",
    raw,
    state: "complete",
    attributes: { type: "bar" },
  });
  expect(parse("<chart>\n{}\n</chart>")).toHaveLength(1);
});
it("ignores tags in matching fences, including shorter nested fences", () => {
  for (const fence of ["```", "~~~", "````"]) {
    const text = `${fence}html\n<chart>\n{}\n</chart>\n${fence}`;
    expect(parse(text)).toEqual([{ kind: "markdown", text }]);
  }
  const text = "````\n```\n~~~\n<chart>\n{}\n</chart>\n````\n";
  expect(parse(text)).toEqual([{ kind: "markdown", text }]);
  expect(
    parse("```\nx\n``` text\n<chart>\n```\n<chart>\n{}\n</chart>").at(-1),
  ).toMatchObject({ kind: "block" });
});
it("retains incomplete input with the right lifecycle", () => {
  for (const streaming of [true, false]) {
    expect(parse('<chart title="Test">\n{', streaming)).toMatchObject([
      {
        kind: "block",
        body: "{",
        state: streaming ? "streaming" : "unterminated",
      },
    ]);
  }
  expect(parse("<chart>")).toMatchObject([{ body: "" }]);
  expect(
    parseTaggedBlocks("<diagram>\nx\n</diagram>", {
      streaming: false,
      tags: ["diagram"],
    }),
  ).toMatchObject([{ tag: "diagram", state: "complete" }]);
});
