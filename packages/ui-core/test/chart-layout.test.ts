import { expect, it } from "vitest";
import {
  chartLayout,
  chartBars,
  chartPaths,
  chartSlices,
  type CartesianChartSpec,
} from "../src/index.js";
const spec: CartesianChartSpec = {
  type: "bar",
  stacked: false,
  x: ["A", "B"],
  series: [
    { name: "One", data: [2, -2] },
    { name: "Two", data: [3, -3] },
  ],
};
it("lays out grouped and stacked bars on both sides of zero", () => {
  expect(chartLayout(spec).ticks).toContain(0);
  const grouped = chartBars(spec);
  const stacked = chartBars({ ...spec, stacked: true });
  expect(grouped).toHaveLength(4);
  expect(stacked[2].x).toBe(stacked[0].x);
  expect(grouped[2].x).not.toBe(grouped[0].x);
  expect(stacked[2].height).toBeGreaterThan(0);
  expect(
    chartBars({ ...spec, series: [{ name: "gaps", data: [null, 0] }] })[0]
      .height,
  ).toBe(0);
  expect(
    chartBars({
      ...spec,
      stacked: true,
      series: [
        { name: "gaps", data: [null, 0] },
        { name: "negative", data: [-1, 2] },
      ],
    }),
  ).toHaveLength(4);
  expect(chartLayout({ ...spec, type: "line" }).ticks).toContain(-4);
  expect(
    chartLayout({
      ...spec,
      type: "line",
      series: [{ name: "Gap", data: [null, null] }],
    }).ticks,
  ).toEqual([0, 1]);
});
it("splits line paths at gaps and draws a baseline for areas", () => {
  expect(chartPaths(spec, [null, 2, null, null, 3])).toHaveLength(2);
  expect(chartPaths(spec, [null])).toEqual([]);
  expect(chartPaths(spec, [1, 2])[0].line).toContain(" L");
  expect(chartPaths(spec, [1])[0].area).toMatch(/Z$/);
});
it("lays out percentages and a full circle", () => {
  expect(
    chartSlices({
      type: "pie",
      slices: [
        { label: "A", value: 3 },
        { label: "B", value: 1 },
      ],
    }).map((s) => s.percent),
  ).toEqual([75, 25]);
  expect(
    chartSlices({
      type: "pie",
      slices: [{ label: "All", value: 1 }],
    })[0].path.match(/A86/g),
  ).toHaveLength(2);
});

it("stacks tiny values end to end without multiplying signs", () => {
  for (const sign of [1, -1]) {
    const bars = chartBars({
      type: "bar",
      stacked: true,
      x: ["A"],
      series: [
        { name: "One", data: [sign * 1e-200] },
        { name: "Two", data: [sign * 2e-200] },
      ],
    });
    const [first, second] = bars;
    expect(sign > 0 ? second.y + second.height : second.y).toBeCloseTo(
      sign > 0 ? first.y : first.y + first.height,
    );
    expect(first.height + second.height).toBeCloseTo(164);
  }
});
