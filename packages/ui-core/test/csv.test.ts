import { expect, it } from "vitest";
import { parseCsv } from "../src/index.js";
it("parses quoted fields, escaped quotes and embedded newlines", () => {
  expect(parseCsv('a,b\r\n"x,y","say ""hi"""\n"two\nlines",z').rows).toEqual([
    ["a", "b"],
    ["x,y", 'say "hi"'],
    ["two\nlines", "z"],
  ]);
  expect(parseCsv("x\ty\r1\t2", "\t").rows).toEqual([
    ["x", "y"],
    ["1", "2"],
  ]);
  expect(parseCsv("a,b\n", ",", 1)).toEqual({
    rows: [["a", "b"]],
    truncated: false,
  });
  expect(parseCsv("a\nb\nc", ",", 2)).toEqual({
    rows: [["a"], ["b"]],
    truncated: true,
  });
  expect(parseCsv("a,b\n").rows).toHaveLength(1);
  expect(parseCsv('a"b,').rows).toEqual([['a"b', ""]]);
  expect(parseCsv("")).toEqual({ rows: [], truncated: false });
});
