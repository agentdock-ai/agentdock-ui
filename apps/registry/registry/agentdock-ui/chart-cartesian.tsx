"use client";
import type { ReactNode } from "react";
import {
  chartLayout,
  CHART_PLOT,
  formatValue,
  type CartesianChartSpec,
} from "@agentdock-ai/ui-core";
export function ChartCartesian({
  spec,
  children,
}: {
  spec: CartesianChartSpec;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 600 220"
      className="h-[220px] w-full overflow-visible"
      aria-label={`${spec.type} chart`}
    >
      <ChartTicks spec={spec} />
      <ChartLabels spec={spec} />
      {children}
    </svg>
  );
}

function ChartTicks({ spec }: { spec: CartesianChartSpec }) {
  const { ticks, y } = chartLayout(spec);
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={CHART_PLOT.left}
            x2={CHART_PLOT.right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-border"
          />
          <text
            x={CHART_PLOT.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[16px]"
          >
            {formatValue(tick, spec.unit)}
          </text>
        </g>
      ))}
    </>
  );
}
function ChartLabels({ spec }: { spec: CartesianChartSpec }) {
  const { x } = chartLayout(spec);
  return (
    <>
      {spec.x.map(
        (label, i) =>
          i % Math.max(1, Math.ceil(spec.x.length / 10)) === 0 && (
            <text
              key={i}
              x={x(i)}
              y={204}
              textAnchor="middle"
              className="fill-muted-foreground text-[16px]"
            >
              {String(label).slice(0, 16)}
            </text>
          ),
      )}
    </>
  );
}
