import { cartesianData, pieData, hasFiniteStacks } from "./chart-data.js";
import type {
  ChartSpec,
  ChartSpecResult,
  ChartOptions,
} from "./chart-types.js";
export function isChartType(type: string): type is ChartSpec["type"] {
  return type === "bar" || type === "line" || type === "area" || type === "pie";
}
export function chartSpecData(
  type: ChartSpec["type"],
  options: ChartOptions,
  stacked: boolean,
  value: unknown,
): ChartSpecResult {
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
  if (!data)
    return {
      ok: false,
      reason:
        "Use 1–8 series with 1–200 matching points, short labels and finite numbers (line gaps may be null).",
    };
  if (type === "bar" && stacked && !hasFiniteStacks(data))
    return { ok: false, reason: "Stacked totals must be finite." };
  return { ok: true, spec: { ...options, ...data, type, stacked } };
}
