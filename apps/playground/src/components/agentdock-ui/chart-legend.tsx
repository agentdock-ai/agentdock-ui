import { chartColor } from "./chart-colors";
export function ChartLegend({ names }: { names: readonly string[] }) {
  return (
    <ul
      aria-label="Legend"
      className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-muted-foreground"
    >
      {names.map((name, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <svg width={10} height={10} aria-hidden="true">
            <rect width={10} height={10} rx={2} className={chartColor(i)} />
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}
