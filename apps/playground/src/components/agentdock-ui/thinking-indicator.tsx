import { ShimmerText } from "./shimmer-text";
export function ThinkingIndicator({
  label = "thinking",
}: {
  label?: "thinking" | "working";
}) {
  return (
    <div
      className="flex min-h-7 items-center px-1 text-[13px] leading-5 text-muted-foreground"
      aria-hidden="true"
    >
      <ShimmerText className="inline-block first-letter:uppercase">
        {label}
      </ShimmerText>
    </div>
  );
}
