import { expect, it } from "vitest";
import {
  artifactTextMatches,
  sortCsvRows,
  artifactBytes,
} from "../src/index.js";
it("finds literal case-insensitive matches with a bounded output", () => {
  expect(artifactTextMatches("A.b a.B!", "a.b")).toEqual([
    { text: "A.b", match: true },
    { text: " ", match: false },
    { text: "a.B", match: true },
    { text: "!", match: false },
  ]);
  expect(artifactTextMatches("text", "")).toEqual([
    { text: "text", match: false },
  ]);
  expect(artifactTextMatches("abc", "x")).toEqual([
    { text: "abc", match: false },
  ]);
  expect(artifactTextMatches("a".repeat(5000), "a")).toHaveLength(2001);
  expect(artifactBytes("é")).toBe(2);
  expect(artifactBytes()).toBe(0);
});
it("sorts numeric and textual CSV columns without mutating input", () => {
  const rows = [["12"], ["2"], ["-1"]];
  expect(sortCsvRows(rows, 0)).toEqual([["-1"], ["2"], ["12"]]);
  expect(sortCsvRows(rows, 0, true)[0]).toEqual(["12"]);
  expect(sortCsvRows(rows, -1)).toEqual(rows);
  expect(rows[0]).toEqual(["12"]);
  expect(sortCsvRows([["b"], ["a"]], 0)).toEqual([["a"], ["b"]]);
  expect(sortCsvRows([[], [""]], 0)).toEqual([[], [""]]);
  expect(sortCsvRows([[""], ["a"], ["1e999"], ["2"]], 0)).toHaveLength(4);
});

it("sorts mixed columns consistently across input permutations", () => {
  const mixed = [["2"], ["10"], ["1a"]];
  const sorted = sortCsvRows(mixed, 0);
  for (const rows of [
    mixed,
    [mixed[1], mixed[2], mixed[0]],
    [...mixed].reverse(),
  ]) {
    expect(sortCsvRows(rows, 0)).toEqual(sorted);
    expect(sortCsvRows(rows, 0, true)).toEqual([...sorted].reverse());
  }
  expect(sortCsvRows([["3"], [""], ["2"]], 0)).toEqual([[""], ["2"], ["3"]]);
  expect(sortCsvRows([["10"], ["2"]], 0)).toEqual([["2"], ["10"]]);
  expect(sortCsvRows([[], ["2"]], 0)).toEqual([[], ["2"]]);
});
