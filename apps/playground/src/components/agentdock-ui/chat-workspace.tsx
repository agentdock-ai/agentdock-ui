"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessagesSquare, PanelLeft, X } from "lucide-react";
import { ChatIcon } from "./icon";
import { cn } from "./utils";
const iconButton =
  "flex size-7 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:size-9";
export function ChatWorkspace({
  children,
  sidebar,
  title = "New chat",
  brand = "Agentdock",
  actions,
  className,
}: {
  children: ReactNode;
  sidebar: ReactNode;
  title?: string;
  brand?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const doubleClickDelayMs = 250;
  const [expanded, setExpanded] = useState(true);
  const mobile = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mobile.current?.close();
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [title]);
  const brandMark = (
    <span className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ChatIcon icon={MessagesSquare} size={14} aria-hidden="true" />
      </span>
      <span className="truncate">{brand}</span>
    </span>
  );
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full overflow-hidden rounded-xl border border-border bg-background font-sans text-foreground antialiased shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      {expanded && (
        <aside
          aria-label="Thread sidebar"
          className="hidden w-60 shrink-0 flex-col border-r border-border bg-muted/40 md:flex"
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 pl-4 pr-2.5 text-[13px]">
            {brandMark}
            <button
              type="button"
              aria-label="Collapse thread sidebar"
              onClick={() => setExpanded(false)}
              className={iconButton}
            >
              <ChatIcon icon={PanelLeft} size={15} />
            </button>
          </div>
          <div className="min-h-0 flex-1">{sidebar}</div>
        </aside>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/70 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open thread sidebar"
              onClick={() => {
                if (matchMedia("(min-width: 768px)").matches) setExpanded(true);
                else mobile.current?.showModal();
              }}
              className={cn(iconButton, expanded && "md:hidden")}
            >
              <ChatIcon icon={PanelLeft} size={15} />
            </button>
            <span className="truncate text-[13px] font-medium">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {actions}
          </div>
        </header>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <dialog
        ref={mobile}
        aria-label="Thread sidebar"
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[min(19rem,85vw)] max-w-none border-0 border-r border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex h-full min-h-0 flex-col bg-muted/40">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 pl-4 pr-2.5 text-[13px]">
            {brandMark}
            <button
              type="button"
              aria-label="Close thread sidebar"
              onClick={() => mobile.current?.close()}
              className={iconButton}
            >
              <ChatIcon icon={X} size={15} />
            </button>
          </div>
          <div
            className="min-h-0 flex-1"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("[data-thread-navigation]")
              ) {
                if (event.target.closest("[data-thread-editable]")) {
                  if (closeTimer.current) clearTimeout(closeTimer.current);
                  closeTimer.current = setTimeout(() => {
                    closeTimer.current = null;
                    mobile.current?.close();
                  }, doubleClickDelayMs);
                } else mobile.current?.close();
              }
            }}
            onDoubleClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("[data-thread-editable]")
              ) {
                if (closeTimer.current) clearTimeout(closeTimer.current);
                closeTimer.current = null;
              }
            }}
          >
            {sidebar}
          </div>
        </div>
      </dialog>
    </div>
  );
}
