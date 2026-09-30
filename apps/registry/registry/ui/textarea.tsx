import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../agentdock-ui/utils.js";
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "block min-h-8 w-full resize-none bg-transparent px-2 py-1 text-[14px] leading-6 [@media(pointer:coarse)]:text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
