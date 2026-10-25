import { expect, it } from "vitest";
import { parseChartSpec } from "../src/index.js";
const data = { x: ["Jan", 2], series: [{ name: "Sales", data: [1, 2] }] };
const parse = (value: unknown, type = "bar", attrs = {}) =>
  parseChartSpec({ type, ...attrs }, JSON.stringify(value));
it("accepts each chart type and only allows null gaps for lines", () => {
  for (const type of ["bar", "line", "area"])
    expect(parse(data, type, { stacked: "true" })).toMatchObject({
      ok: true,
      spec: { type, stacked: true },
    });
  expect(
    parse(
      {
        slices: [
          { label: "A", value: 1 },
          { label: "B", value: 0 },
        ],
      },
      "pie",
    ),
  ).toMatchObject({ ok: true });
  for (const type of ["bar", "line", "area"])
    expect(
      parse({ x: [1], series: [{ name: "gap", data: [null] }] }, type).ok,
    ).toBe(type === "line");
});
it("rejects syntax, unknown types and long metadata", () => {
  for (const attributes of [
    {},
    { type: "scatter" },
    { type: "bar", title: "x".repeat(121) },
    { type: "bar", unit: "x".repeat(61) },
  ])
    expect(
      parseChartSpec(
        Object.fromEntries(
          Object.entries(attributes).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
        "{}",
      ).ok,
    ).toBe(false);
  expect(parseChartSpec({ type: "bar" }, "oops")).toMatchObject({ ok: false });
  expect(
    parseChartSpec(
      { type: "line" },
      '{"x":[1],"series":[{"name":"A","data":[1e999]}]}',
    ).ok,
  ).toBe(false);
});
it("validates Cartesian structure and every limit", () => {
  const invalid = [
    null,
    [],
    {},
    { x: [], series: [] },
    { ...data, x: [false] },
    { ...data, x: ["x".repeat(61)] },
    { ...data, x: ["x"] },
    { ...data, x: Array(201).fill(1) },
    { ...data, series: Array(9).fill(data.series[0]) },
    { ...data, series: [] },
    { ...data, series: [null] },
    { ...data, series: [{ name: 1, data: [1, 2] }] },
    { ...data, series: [{ name: "x".repeat(61), data: [1, 2] }] },
    { ...data, series: [{ name: "X", data: false }] },
    { ...data, series: [{ name: "X", data: [false, 2] }] },
  ];
  for (const value of invalid)
    expect(parse(value).ok, JSON.stringify(value)).toBe(false);
  expect(parse({ x: [1, 2], series: [{ name: "", data: [-1, 0] }] }).ok).toBe(
    true,
  );
});
it("validates pie bounds, labels, values and totals", () => {
  for (const value of [
    null,
    {},
    { slices: false },
    { slices: [] },
    { slices: Array(13).fill({ label: "A", value: 1 }) },
    ...[
      null,
      { label: false, value: 1 },
      { label: "x".repeat(61), value: 1 },
      { label: "A", value: -1 },
      { label: "A", value: 0 },
      { label: "A", value: "1" },
    ].map((s) => ({ slices: [s] })),
    {
      slices: [
        { label: "A", value: 1e308 },
        { label: "B", value: 1e308 },
      ],
    },
  ])
    expect(parse(value, "pie").ok).toBe(false);
});

it("rejects stacked totals that overflow the finite chart domain", () => {
  for (const value of [1e308, -1e308])
    expect(
      parse(
        {
          x: ["A"],
          series: [
            { name: "A", data: [value] },
            { name: "B", data: [value] },
          ],
        },
        "bar",
        { stacked: "true" },
      ).ok,
    ).toBe(false);
});
