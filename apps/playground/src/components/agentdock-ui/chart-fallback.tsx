import { Alert } from "./alert";
export function ChartFallback({
  reason,
  raw,
}: {
  reason: string;
  raw: string;
}) {
  return (
    <Alert tone="warning" status="Chart" title="Couldn’t draw this chart">
      {reason}
      <details className="mt-2">
        <summary className="cursor-pointer">Show source</summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs">
          {raw}
        </pre>
      </details>
    </Alert>
  );
}
export function ChartSkeleton({ title }: { title?: string }) {
  return (
    <section
      role="status"
      aria-label="Loading chart"
      className="rounded-xl border border-border bg-card"
    >
      <div className="flex h-[58px] items-center px-4 text-sm font-medium">
        {title || "Chart"}
      </div>
      <div className="h-[220px] p-4">
        <div className="h-full rounded-lg bg-muted motion-safe:animate-pulse" />
      </div>
      <div aria-hidden="true" className="h-7" />
    </section>
  );
}
