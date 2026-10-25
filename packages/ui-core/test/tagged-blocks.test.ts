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

it("preserves multiline code spans, including matching runs and literal backslashes", () => {
  const chart = '<chart type="bar">\r\n{}\r\n</chart>';
  for (const marker of ["`", "``", "````"]) {
    const text = `${marker}example\r\n${chart}\r\nexample${marker}`;
    expect(parse(text)).toEqual([{ kind: "markdown", text }]);
  }
  const escapedClosing = "`example\n" + chart + "\n\\`";
  expect(parse(escapedClosing)).toEqual([
    { kind: "markdown", text: escapedClosing },
  ]);
  expect(parse("\\`literal\n" + chart).some((s) => s.kind === "block")).toBe(
    true,
  );
  expect(
    parse("`unmatched\n\n" + chart + "\n`").some((s) => s.kind === "block"),
  ).toBe(true);
  expect(parse("``unmatched\n" + chart).some((s) => s.kind === "block")).toBe(
    true,
  );
  expect(parse("`inline`\n" + chart).some((s) => s.kind === "block")).toBe(
    true,
  );
  expect(
    parse("```\n`fenced\n```\n" + chart + "\n`after").some(
      (s) => s.kind === "block",
    ),
  ).toBe(true);
  expect(parse("`one` `two`\n" + chart).some((s) => s.kind === "block")).toBe(
    true,
  );
});

it("handles many inline spans without spreading them into call arguments", () => {
  const text = "`x` ".repeat(140000) + "\n\n<chart>\n{}\n</chart>";
  expect(parse(text).at(-1)).toMatchObject({ kind: "block" });
});
