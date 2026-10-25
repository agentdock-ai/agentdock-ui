import { expect, it } from "vitest";
import { niceTicks, linearScale, formatValue } from "../src/index.js";
it("produces rounded ticks for common, negative, tiny and flat ranges", () => {
  expect(niceTicks(0, 16)).toEqual([0, 5, 10, 15, 20]);
  expect(niceTicks(-4, 4)).toEqual([-4, -2, 0, 2, 4]);
  expect(niceTicks(0, 4)).toEqual([0, 1, 2, 3, 4]);
  expect(niceTicks(0, 30)).toEqual([0, 10, 20, 30]);
  expect(niceTicks(0, 0)).toEqual([0, 1]);
  expect(niceTicks(10, 10)).toEqual([9, 10, 11]);
  expect(niceTicks(0, 0.0004)).toEqual([0, 0.0001, 0.0002, 0.0003, 0.0004]);
  for (const [min, max, count] of [
    [NaN, 1, 5],
    [0, Infinity, 5],
    [2, 1, 5],
    [0, 2, 1],
  ])
    expect(niceTicks(min, max, count)).toEqual([0, 1]);
  expect(niceTicks(0, Number.MIN_VALUE)).toEqual([0, Number.MIN_VALUE]);
  expect(niceTicks(-Number.MAX_VALUE, Number.MAX_VALUE)).toEqual([
    -Number.MAX_VALUE,
    Number.MAX_VALUE,
  ]);
});
it("scales endpoints, flat and extreme domains and formats units", () => {
  expect(linearScale([0, 10], [0, 100])(5)).toBe(50);
  expect(linearScale([2, 2], [0, 100])(2)).toBe(50);
  expect(linearScale([-1e308, 1e308], [0, 100])(0)).toBe(50);
  expect(formatValue(12, "$k")).toBe("$12k");
  expect(formatValue(12, "%")).toBe("12 %");
  expect(formatValue(1200)).toBe("1,200");
});
