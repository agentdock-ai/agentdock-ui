"use client";
import {
  chartPaths,
  formatValue,
  type CartesianChartSpec,
} from "@agentdock-ai/ui-core";
import { ChartCartesian } from "./chart-cartesian";
import { ChartTooltip } from "./chart-tooltip";
import { chartColor } from "./chart-colors";
export function ChartLine({ spec }: { spec: CartesianChartSpec }) {
  return (
    <ChartCartesian spec={spec}>
      {spec.series.map((series, i) => (
        <g key={i} className={chartColor(i)}>
          {chartPaths(spec, series.data).map((group, gi) => (
            <g key={gi}>
              {spec.type === "area" && (
                <path d={group.area} stroke="none" opacity={0.15} />
              )}
              <path d={group.line} fill="none" strokeWidth={2} />
              {group.points.map((point) => (
                <ChartTooltip
                  key={point.index}
                  label={`${series.name}, ${spec.x[point.index]}: ${formatValue(point.value, spec.unit)}`}
                  x={point.x}
                  y={point.y}
                  width={600}
                >
                  <circle cx={point.x} cy={point.y} r={4} />
                </ChartTooltip>
              ))}
            </g>
          ))}
        </g>
      ))}
    </ChartCartesian>
  );
}
