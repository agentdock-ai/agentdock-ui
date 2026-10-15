import type { ReactNode } from "react";
import { cn } from "./utils.js";
export function ChatShell({
  children,
  footer,
  className,
  empty = false,
}: {
  children: ReactNode;
  footer: ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <section
      aria-label="Agent conversation"
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col bg-background font-sans text-[14px] text-foreground antialiased",
        empty ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
    >
      <div className={empty ? "hidden" : "contents"}>{children}</div>
      <div
        className={cn(
          "relative z-10 shrink-0 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          empty ? "my-auto w-full py-10" : "pt-1 sm:pb-5",
        )}
      >
        {!empty && (
          // Lets the transcript fade out under the composer instead of being cut.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-linear-to-t from-background to-transparent"
          />
        )}
        <div className="mx-auto w-full max-w-[42rem]">{footer}</div>
      </div>
    </section>
  );
}
