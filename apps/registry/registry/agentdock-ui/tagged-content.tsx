import { parseTaggedBlocks } from "@agentdock-ai/ui-core";
import { MarkdownContent } from "./markdown-content.js";
import { ChartBlock } from "./chart-block.js";
export function TaggedContent({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-3">
      {parseTaggedBlocks(text, { streaming }).map((segment, i) =>
        segment.kind === "markdown" ? (
          <MarkdownContent key={i} text={segment.text} />
        ) : (
          <ChartBlock key={i} block={segment} />
        ),
      )}
    </div>
  );
}
