export interface ChartOptions {
  title?: string;
  unit?: string;
}
export interface CartesianChartSpec extends ChartOptions {
  type: "bar" | "line" | "area";
  stacked: boolean;
  x: readonly (string | number)[];
  /** Null represents a gap, supported only by line charts. */
  series: readonly { name: string; data: readonly (number | null)[] }[];
}
export interface PieChartSpec extends ChartOptions {
  type: "pie";
  slices: readonly { label: string; value: number }[];
}
export type ChartSpec = CartesianChartSpec | PieChartSpec;
export type ChartSpecResult =
  { ok: true; spec: ChartSpec } | { ok: false; reason: string };
