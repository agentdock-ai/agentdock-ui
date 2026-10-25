import {
  chartBars,
  formatValue,
  type CartesianChartSpec,
} from "@agentdock-ai/ui-core";
import { ChartCartesian } from "./chart-cartesian";
import { ChartTooltip } from "./chart-tooltip";
import { chartColor } from "./chart-colors";
export function ChartBar({ spec }: { spec: CartesianChartSpec }) {
  return (
    <ChartCartesian spec={spec}>
      {chartBars(spec).map((bar) => (
        <ChartTooltip
          key={`${bar.series}:${bar.index}`}
          label={`${spec.series[bar.series].name}, ${spec.x[bar.index]}: ${formatValue(bar.value, spec.unit)}`}
        >
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={2}
            className={chartColor(bar.series)}
          />
        </ChartTooltip>
      ))}
    </ChartCartesian>
  );
}
