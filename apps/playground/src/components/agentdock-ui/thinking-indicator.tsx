"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ChatIcon } from "./icon";
import { Button } from "./ui/button";

export function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** Live status line: what is happening, the running step and elapsed time. */
export function ThinkingIndicator({
  label = "thinking",
  startedAt,
  step,
  longAfterMs = 30_000,
  onStop,
}: {
  label?: "thinking" | "working";
  /** ISO timestamp or epoch ms; elapsed time shows once mounted. */
  startedAt?: string | number;
  /** The step in progress, such as `{ label: "Searching the web", tool: "web_search" }`. */
  step?: { label: string; tool?: string };
  /** After this long the line offers Stop and says the step is slow. */
  longAfterMs?: number;
  onStop?: () => void;
}) {
  const start =
    typeof startedAt === "string" ? Date.parse(startedAt) : startedAt;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (start === undefined || !Number.isFinite(start)) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [start]);
  const elapsed =
    start !== undefined && Number.isFinite(start) && now !== null
      ? Math.max(0, now - start)
      : null;
  const long = elapsed !== null && elapsed >= longAfterMs;
  const text = long
    ? "Still working"
    : (step?.label ?? (label === "working" ? "Working" : "Thinking"));
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-1">
      <div className="flex min-h-7 min-w-0 items-center gap-2 text-[13px] leading-5 text-muted-foreground">
        {step || long ? (
          <ChatIcon
            icon={LoaderCircle}
            size={13}
            className="text-foreground motion-safe:animate-spin"
          />
        ) : (
          <Dots />
        )}
        <span aria-hidden="true" className="text-foreground">
          {text}
        </span>
        {step?.tool && (
          <span aria-hidden="true" className="truncate font-mono text-xs">
            {step.tool}
          </span>
        )}
        {elapsed !== null && (
          <span aria-hidden="true" className="font-mono text-xs tabular-nums">
            {formatElapsed(elapsed)}
          </span>
        )}
        {long && onStop && (
          <Button
            variant="outline"
            className="ml-auto min-h-7 px-2.5 text-[12.5px]"
            onClick={onStop}
          >
            Stop
          </Button>
        )}
      </div>
      {long && (
        <p className="text-xs leading-[18px] text-muted-foreground">
          This step is taking longer than usual.
        </p>
      )}
    </div>
  );
}

/** Three staggered dots via the Web Animations API; still under reduced motion. */
function Dots() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      (typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    const animations = [...element.children].flatMap((dot, index) =>
      typeof dot.animate === "function"
        ? [
            dot.animate([{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }], {
              duration: 1200,
              delay: index * 200,
              iterations: Infinity,
            }),
          ]
        : [],
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="flex w-4 shrink-0 items-center justify-between text-foreground"
    >
      <span className="size-[3px] rounded-full bg-current" />
      <span className="size-[3px] rounded-full bg-current" />
      <span className="size-[3px] rounded-full bg-current" />
    </span>
  );
}
