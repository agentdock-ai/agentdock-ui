"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./utils.js";

/**
 * Sweeps a soft highlight across live status text. Uses the Web Animations API
 * so no stylesheet or keyframes are required; holds still for reduced motion.
 */
export function ShimmerText({
  children,
  active = true,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !active ||
      !element ||
      typeof element.animate !== "function" ||
      (typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    const animation = element.animate(
      [{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0" }],
      {
        duration: 2000,
        iterations: Infinity,
        easing: "cubic-bezier(0.45, 0, 0.55, 1)",
      },
    );
    return () => animation.cancel();
  }, [active]);
  return (
    <span
      ref={ref}
      className={cn(
        active &&
          "bg-linear-to-r from-muted-foreground/75 from-35% via-foreground via-50% to-muted-foreground/75 to-65% bg-[length:250%_100%] bg-clip-text bg-no-repeat text-transparent [background-position:100%_0]",
        className,
      )}
    >
      {children}
    </span>
  );
}
