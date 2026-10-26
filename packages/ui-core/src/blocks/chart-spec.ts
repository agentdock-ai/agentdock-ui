import { CHART_LIMITS } from "./chart-limits.js";
import { isChartType, chartSpecData } from "./chart-spec-data.js";
import type { ChartSpecResult } from "./chart-types.js";
export function parseChartSpec(
  attributes: Record<string, string>,
  body: string,
): ChartSpecResult {
  const { type, title, unit } = attributes;
  if (!isChartType(type))
    return { ok: false, reason: "Use chart type bar, line, area or pie." };
  if (
    (title?.length ?? 0) > CHART_LIMITS.title ||
    (unit?.length ?? 0) > CHART_LIMITS.label
  )
    return { ok: false, reason: "The chart title or unit is too long." };
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { ok: false, reason: "The chart body must be valid JSON." };
  }
  return chartSpecData(
    type,
    { title, unit },
    attributes.stacked === "true",
    value,
  );
}
