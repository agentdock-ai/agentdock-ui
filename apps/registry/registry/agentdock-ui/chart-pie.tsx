"use client";
import {
  chartSlices,
  formatValue,
  type PieChartSpec,
} from "@agentdock-ai/ui-core";
import { ChartTooltip } from "./chart-tooltip.js";
import { chartColor } from "./chart-colors.js";
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
          x={slice.x}
          y={slice.y}
          width={200}
          fontSize={8}
        >
          <path d={slice.path} className={chartColor(slice.index)} />
          {slice.percent >= 5 && (
            <text
              x={slice.x}
              y={slice.y}
              textAnchor="middle"
              dominantBaseline="middle"
              paintOrder="stroke"
              strokeWidth={3}
              className="fill-foreground stroke-card text-[10px] font-semibold"
            >
              {slice.percent}%
            </text>
          )}
        </ChartTooltip>
      ))}
    </svg>
  );
}
