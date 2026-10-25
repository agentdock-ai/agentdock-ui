/** Rounded ticks with a finite fallback for degenerate domains. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || count < 2)
    return [0, 1];
  if (min === max)
    return min === 0
      ? [0, 1]
      : [min - Math.abs(min) * 0.1, min, min + Math.abs(min) * 0.1];
  const rough = max / (count - 1) - min / (count - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const step =
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  if (!Number.isFinite(step) || step === 0) return [min, max];
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [min, max];
  const ticks = Array.from(
    { length: Math.min(100, Math.round((end - start) / step) + 1) },
    (_, i) => Number((start + i * step).toPrecision(12)),
  );
  return ticks.length > 1 ? ticks : [min, max];
}
export function linearScale(
  [min, max]: readonly [number, number],
  [start, end]: readonly [number, number],
): (value: number) => number {
  return (value) =>
    min === max
      ? (start + end) / 2
      : start + ((value / 2 - min / 2) / (max / 2 - min / 2)) * (end - start);
}
export function formatValue(value: number, unit = ""): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
  return unit.startsWith("$")
    ? `$${formatted}${unit.slice(1)}`
    : `${formatted}${unit ? ` ${unit}` : ""}`;
}
