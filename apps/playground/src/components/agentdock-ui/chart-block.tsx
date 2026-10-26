"use client";
import { parseChartSpec, type TaggedBlock } from "@agentdock-ai/ui-core";
import { ChartFrame } from "./chart-frame";
import { ChartBar } from "./chart-bar";
import { ChartLine } from "./chart-line";
import { ChartPie } from "./chart-pie";
import { ChartFallback, ChartSkeleton } from "./chart-fallback";
export function ChartBlock({ block }: { block: TaggedBlock }) {
  if (block.state === "streaming")
    return <ChartSkeleton title={block.attributes.title} />;
  if (block.state === "unterminated")
    return (
      <ChartFallback
        reason="The closing chart tag is missing."
        raw={block.raw}
      />
    );
  const parsed = parseChartSpec(block.attributes, block.body);
  if (!parsed.ok)
    return <ChartFallback reason={parsed.reason} raw={block.raw} />;
  const { spec } = parsed;
  return (
    <ChartFrame spec={spec}>
      {spec.type === "pie" ? (
        <ChartPie spec={spec} />
      ) : spec.type === "bar" ? (
        <ChartBar spec={spec} />
      ) : (
        <ChartLine spec={spec} />
      )}
    </ChartFrame>
  );
}
