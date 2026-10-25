import { CHART_LIMITS } from "./chart-limits.js";
import type { CartesianChartSpec, PieChartSpec } from "./chart-types.js";
const label = (value: unknown): value is string =>
  typeof value === "string" && value.length <= CHART_LIMITS.label;
export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export function cartesianData(
  value: unknown,
  gaps: boolean,
): Pick<CartesianChartSpec, "x" | "series"> | undefined {
  if (!record(value) || !Array.isArray(value.x) || !Array.isArray(value.series))
    return;
  const { x, series } = value;
  if (
    !x.length ||
    x.length > CHART_LIMITS.points ||
    !x.every((v) => label(v) || finite(v)) ||
    !series.length ||
    series.length > CHART_LIMITS.series
  )
    return;
  const parsed: { name: string; data: (number | null)[] }[] = [];
  for (const item of series) {
    if (
      !record(item) ||
      !label(item.name) ||
      !Array.isArray(item.data) ||
      item.data.length !== x.length ||
      !item.data.every((v) => finite(v) || (gaps && v === null))
    )
      return;
    parsed.push({ name: item.name, data: item.data });
  }
  return { x, series: parsed };
}
export function pieData(value: unknown): PieChartSpec["slices"] | undefined {
  if (
    !record(value) ||
    !Array.isArray(value.slices) ||
    !value.slices.length ||
    value.slices.length > CHART_LIMITS.slices
  )
    return;
  const slices: { label: string; value: number }[] = [];
  for (const item of value.slices) {
    if (
      !record(item) ||
      !label(item.label) ||
      !finite(item.value) ||
      item.value < 0
    )
      return;
    slices.push({ label: item.label, value: item.value });
  }
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total > 0 && Number.isFinite(total)) return slices;
}
