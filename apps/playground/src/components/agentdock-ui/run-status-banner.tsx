import type { ReactNode } from "react";
import { LoaderCircle, Pause, Square, WifiOff } from "lucide-react";
import { Alert, toneText, type AlertTone } from "./alert";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

export type RunStatusState =
  | "paused"
  | "paused-elsewhere"
  | "stopped"
  | "cancelled"
  | "reconnecting"
  | "offline";

const states: Record<
  RunStatusState,
  {
    tone: AlertTone;
    status: string;
    icon: typeof Pause;
    title: string;
    detail: string;
  }
> = {
  paused: {
    tone: "neutral",
    status: "Paused",
    icon: Pause,
    title: "Run paused",
    detail:
      "A breakpoint stopped the run so you can check its progress. Nothing is lost.",
  },
  "paused-elsewhere": {
    tone: "neutral",
    status: "Paused elsewhere",
    icon: Pause,
    title: "Continue this run in your app",
    detail:
      "It’s waiting at a step this screen can’t resume. Open it where it started.",
  },
  stopped: {
    tone: "neutral",
    status: "Stopped by you",
    icon: Square,
    title: "The partial answer is kept",
    detail: "Continue from where it stopped, or write the answer again.",
  },
  cancelled: {
    tone: "warning",
    status: "Stopped by the app",
    icon: Square,
    title: "The server ended this run",
    detail: "Nothing after the last completed step ran.",
  },
  reconnecting: {
    tone: "info",
    status: "Reconnecting",
    icon: LoaderCircle,
    title: "The connection dropped",
    detail: "Events already received are kept.",
  },
  offline: {
    tone: "error",
    status: "Offline",
    icon: WifiOff,
    title: "Can’t reconnect",
    detail:
      "Check your connection. Your message and the partial answer are saved.",
  },
};

/** One banner for every pause, stop and connection state, with its next step. */
export function RunStatusBanner({
  state,
  title,
  detail,
  meta,
  hint,
  actions,
  progress,
}: {
  state: RunStatusState;
  title?: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  /** 0–1 progress toward the next reconnect attempt. */
  progress?: number;
}) {
  const config = states[state];
  return (
    <Alert
      tone={config.tone}
      status={config.status}
      marker={
        state === "reconnecting" ? (
          <ChatIcon
            icon={LoaderCircle}
            size={13}
            className="motion-safe:animate-spin"
          />
        ) : undefined
      }
      icon={config.icon}
      meta={meta}
      title={title ?? config.title}
      quiet={state === "paused-elsewhere"}
      details={
        progress !== undefined && (
          <div
            role="progressbar"
            aria-label="Next reconnect attempt"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(1, Math.max(0, progress)) * 100)}
            className="h-0.5 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none dark:bg-blue-400"
              style={{
                width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
              }}
            />
          </div>
        )
      }
      hint={hint}
      actions={actions}
    >
      {detail ?? config.detail}
    </Alert>
  );
}

/** One quiet line under an answer: what happened and the next step. */
export function TurnStatus({
  state,
  children,
  action,
}: {
  state: "stopped" | "cancelled" | "paused";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <p className="flex min-w-0 items-center gap-2 border-t border-border px-1 pt-2 text-xs leading-[18px] text-muted-foreground">
      <ChatIcon
        icon={state === "paused" ? Pause : Square}
        size={11}
        className={cn(state === "cancelled" && toneText.warning)}
      />
      <span
        className={cn(
          "min-w-0 flex-1",
          state === "cancelled" && cn("font-medium", toneText.warning),
        )}
      >
        {children}
      </span>
      {action}
    </p>
  );
}
