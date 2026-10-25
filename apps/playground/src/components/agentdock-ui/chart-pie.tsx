import {
  chartSlices,
  formatValue,
  type PieChartSpec,
} from "@agentdock-ai/ui-core";
import { ChartTooltip } from "./chart-tooltip";
import { chartColor } from "./chart-colors";
export function ChartPie({ spec }: { spec: PieChartSpec }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-[200px] w-full"
      aria-label="pie chart"
    >
      {chartSlices(spec).map((slice) => (
        <ChartTooltip
          key={slice.index}
          label={`${slice.label}: ${formatValue(slice.value, spec.unit)} (${slice.percent}%)`}
        >
          <path d={slice.path} className={chartColor(slice.index)} />
          {slice.percent >= 5 && (
            <text
              x={slice.x}
              y={slice.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white stroke-none text-[10px] font-semibold dark:fill-slate-950"
            >
              {slice.percent}%
            </text>
          )}
        </ChartTooltip>
      ))}
    </svg>
  );
}
