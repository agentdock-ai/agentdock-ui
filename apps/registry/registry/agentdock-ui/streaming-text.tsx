import { MarkdownContent } from "./markdown-content.js";
export function StreamingText({
  text,
  active,
}: {
  text: string;
  active: boolean;
}) {
  return (
    <div data-streaming={active || undefined} className="relative min-w-0">
      <MarkdownContent text={text} />
      {active && (
        <span
          aria-hidden="true"
          className="mt-1 block h-1 w-3 animate-pulse rounded-full bg-foreground/50 motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
