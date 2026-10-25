import { useState, type ReactNode } from "react";
import type { ChartSpec } from "@agentdock-ai/ui-core";
import { Button } from "../ui/button.js";
import { ChartTable } from "./chart-table.js";
import { ChartLegend } from "./chart-legend.js";
export function ChartFrame({
  spec,
  children,
}: {
  spec: ChartSpec;
  children: ReactNode;
}) {
  const [table, setTable] = useState(false);
  const names =
    spec.type === "pie"
      ? spec.slices.map((s) => s.label)
      : spec.series.map((s) => s.name);
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card text-foreground">
      <header className="flex items-center gap-3 px-4 py-3">
        <h3 className="min-w-0 flex-1 text-sm font-medium">
          {spec.title || "Chart"}
          {spec.unit && (
            <span className="ml-2 text-xs text-muted-foreground">
              {spec.unit}
            </span>
          )}
        </h3>
        <Button onClick={() => setTable(!table)} aria-pressed={table}>
          {table ? "View chart" : "View as table"}
        </Button>
      </header>
      {table ? (
        <ChartTable spec={spec} />
      ) : (
        <figure
          role="img"
          aria-label={`${spec.title || spec.type}: ${names.join(", ")}`}
          className="min-h-[220px]"
        >
          {children}
        </figure>
      )}
      <ChartLegend names={names} />
    </section>
  );
}
