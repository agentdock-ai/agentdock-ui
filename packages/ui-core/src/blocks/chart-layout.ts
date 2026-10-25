import type { CartesianChartSpec } from "./chart-types.js";
import { niceTicks, linearScale } from "./chart-scale.js";
export const CHART_PLOT = {
  left: 64,
  right: 584,
  top: 16,
  bottom: 180,
} as const;
export function chartLayout(spec: CartesianChartSpec) {
  const values = spec.series.flatMap((s) =>
    s.data.filter((v): v is number => v !== null),
  );
  if (spec.type === "bar" && spec.stacked) {
    for (let i = 0; i < spec.x.length; i++) {
      values.push(
        spec.series.reduce((sum, s) => sum + Math.max(0, s.data[i] ?? 0), 0),
      );
      values.push(
        spec.series.reduce((sum, s) => sum + Math.min(0, s.data[i] ?? 0), 0),
      );
    }
  }
  if (spec.type !== "line" || !values.length) values.push(0);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const y = linearScale(
    [ticks[0], ticks[ticks.length - 1]],
    [CHART_PLOT.bottom, CHART_PLOT.top],
  );
  const step = (CHART_PLOT.right - CHART_PLOT.left) / spec.x.length;
  const x = (index: number) => CHART_PLOT.left + step * (index + 0.5);
  return { ticks, x, y, step };
}
export function chartBars(spec: CartesianChartSpec) {
  const { x, y, step } = chartLayout(spec);
  return spec.series.flatMap((series, si) =>
    series.data.map((value, i) => {
      const n = value ?? 0;
      const base = spec.stacked
        ? spec.series
            .slice(0, si)
            .reduce(
              (sum, s) =>
                sum +
                (Math.sign(s.data[i] ?? 0) === Math.sign(n)
                  ? (s.data[i] ?? 0)
                  : 0),
              0,
            )
        : 0;
      const width = (step * 0.75) / (spec.stacked ? 1 : spec.series.length);
      return {
        series: si,
        index: i,
        value: n,
        x: x(i) - step * 0.375 + (spec.stacked ? 0 : si * width),
        y: Math.min(y(base), y(base + n)),
        width,
        height: Math.abs(y(base) - y(base + n)),
      };
    }),
  );
}
/** Separate paths preserve gaps rather than joining across missing observations. */
export function chartPaths(
  spec: CartesianChartSpec,
  data: readonly (number | null)[],
) {
  const { x, y } = chartLayout(spec);
  const groups: { x: number; y: number; value: number; index: number }[][] = [];
  let group: (typeof groups)[number] = [];
  data.forEach((value, index) => {
    if (value === null) {
      if (group.length) groups.push(group);
      group = [];
    } else group.push({ x: x(index), y: y(value), value, index });
  });
  if (group.length) groups.push(group);
  return groups.map((points) => ({
    points,
    line: points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "),
    area: `M${points[0].x},${y(0)} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${y(0)} Z`,
  }));
}
