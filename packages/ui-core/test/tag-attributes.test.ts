import { expect, it } from "vitest";
import { parseTagAttributes } from "../src/index.js";
it("reads quoted attributes, normalises names and keeps the last duplicate", () => {
  expect(
    parseTagAttributes(
      `<chart TYPE="bar" title='Revenue' type='line' unknown="yes" bad=no>`,
    ),
  ).toEqual({ type: "line", title: "Revenue", unknown: "yes" });
  expect(parseTagAttributes("<chart>")).toEqual({});
});
