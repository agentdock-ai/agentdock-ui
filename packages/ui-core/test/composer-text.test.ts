import { expect, it } from "vitest";
import { insertDraftText } from "../src/index.js";
it("inserts speech at the selection with safe word boundaries", () => {
  expect(insertDraftText("", " Hello ")).toEqual({ text: "Hello", cursor: 5 });
  expect(insertDraftText("Draft", "more")).toEqual({
    text: "Draft more",
    cursor: 10,
  });
  expect(insertDraftText("One two", "new", 4, 7)).toEqual({
    text: "One new",
    cursor: 7,
  });
  expect(insertDraftText("helloWorld", "new", 5)).toEqual({
    text: "hello new World",
    cursor: 10,
  });
  expect(insertDraftText("hello world", "new", 5)).toEqual({
    text: "hello new world",
    cursor: 9,
  });
  expect(insertDraftText("abc", "", -1)).toEqual({ text: "abc", cursor: 0 });
  expect(insertDraftText("abc", "x", 99, 100)).toEqual({
    text: "abc x",
    cursor: 5,
  });
});
