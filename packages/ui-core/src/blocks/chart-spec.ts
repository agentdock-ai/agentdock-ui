import { CHART_LIMITS } from "./chart-limits.js";
import { cartesianData, pieData } from "./chart-data.js";
import type { ChartSpecResult } from "./chart-types.js";
export function parseChartSpec(
  attributes: Record<string, string>,
  body: string,
): ChartSpecResult {
  const { type, title, unit } = attributes;
  if (!["bar", "line", "area", "pie"].includes(type))
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
  const options = { title, unit };
  if (type === "pie") {
    const slices = pieData(value);
    return slices
      ? { ok: true, spec: { ...options, type, slices } }
      : {
          ok: false,
          reason:
            "Use 1–12 labelled, non-negative slices with a positive finite total.",
        };
  }
  const data = cartesianData(value, type === "line");
  if (!data || (type !== "bar" && type !== "line" && type !== "area"))
    return {
      ok: false,
      reason:
        "Use 1–8 series with 1–200 matching points, short labels and finite numbers (line gaps may be null).",
    };
  return {
    ok: true,
    spec: { ...options, ...data, type, stacked: attributes.stacked === "true" },
  };
}
