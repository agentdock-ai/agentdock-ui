import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../utils";
export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & {
    variant?: "primary" | "ghost" | "outline";
    /** `icon` is a round, unpadded button; set its dimensions with `size-*`. */
    size?: "default" | "icon";
  }
>(function Button(
  { className, variant = "ghost", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-1.5 text-[13px] font-medium leading-none outline-none transition-[background-color,color,border-color,box-shadow,opacity] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
        size === "icon" ? "rounded-full" : "min-h-8 rounded-lg px-3",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.08)] hover:bg-primary/85"
          : variant === "outline"
            ? "border border-border bg-background text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:bg-muted/70"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
});
