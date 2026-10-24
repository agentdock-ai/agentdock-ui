import type { ReactNode } from "react";
import {
  CircleAlert,
  Check,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { ChatIcon } from "./icon";
import { cn } from "./utils";

export type AlertTone = "error" | "warning" | "info" | "success" | "neutral";

/** Tone colours appear only on the status line, always next to a word. */
export const toneText: Record<AlertTone, string> = {
  error: "text-destructive",
  warning: "text-amber-700 dark:text-amber-400",
  info: "text-blue-700 dark:text-blue-400",
  success: "text-emerald-700 dark:text-emerald-400",
  neutral: "text-muted-foreground",
};
const toneIcons: Record<AlertTone, LucideIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: Check,
  neutral: Info,
};

/** Status line, title, optional detail block, and a footer action bar. */
export function Alert({
  tone = "error",
  status,
  icon,
  marker,
  meta,
  title,
  children,
  details,
  hint,
  actions,
  quiet = false,
  className,
}: {
  tone?: AlertTone;
  /** One word or short phrase naming the state, such as “Run failed”. */
  status: ReactNode;
  /** Replaces the tone’s icon; pass `null` to show the status word alone. */
  icon?: LucideIcon | null;
  /** Any element shown in place of the icon, such as a pulsing dot. */
  marker?: ReactNode;
  /** Right-aligned monospace detail, such as an error code or time. */
  meta?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  details?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  /** A dashed, unelevated surface for read-only states. */
  quiet?: boolean;
  className?: string;
}) {
  return (
    <section
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border",
        quiet
          ? "border-dashed bg-background"
          : "bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2.5 px-[18px] py-4">
        <AlertStatus tone={tone} icon={icon} marker={marker} meta={meta}>
          {status}
        </AlertStatus>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[15px] font-semibold leading-[22px] tracking-[-0.01em] text-foreground [overflow-wrap:anywhere]">
            {title}
          </h3>
          {children && (
            <div className="text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              {children}
            </div>
          )}
        </div>
        {details}
      </div>
      {(hint || actions) && <AlertFooter hint={hint}>{actions}</AlertFooter>}
    </section>
  );
}

export function AlertStatus({
  tone = "neutral",
  icon,
  marker,
  meta,
  children,
}: {
  tone?: AlertTone;
  icon?: LucideIcon | null;
  marker?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const Icon = icon === undefined ? toneIcons[tone] : icon;
  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs font-medium leading-4",
        toneText[tone],
      )}
    >
      {marker ?? (Icon && <ChatIcon icon={Icon} size={13} />)}
      <span className="min-w-0 truncate">{children}</span>
      {meta && (
        <span className="ml-auto shrink-0 font-mono font-normal text-muted-foreground">
          {meta}
        </span>
      )}
    </p>
  );
}

export function AlertFooter({
  hint,
  children,
}: {
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 py-2.5 pl-[18px] pr-3">
      <div className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">
        {hint}
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** One line for tight spaces: icon, sentence and an optional link action. */
export function InlineAlert({
  tone = "error",
  icon,
  children,
  action,
}: {
  tone?: AlertTone;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-foreground"
    >
      <ChatIcon
        icon={icon ?? toneIcons[tone]}
        size={13}

        className={toneText[tone]}
      />
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        {children}
      </span>
      {action}
    </p>
  );
}

/** A keyboard hint drawn inside a button. */
export function Kbd({
  children,
  onPrimary = false,
}: {
  children: ReactNode;
  onPrimary?: boolean;
}) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        "rounded px-1 font-mono text-[10.5px] font-medium leading-4",
        onPrimary
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </kbd>
  );
}

/** A pulsing dot for “waiting on you” states; still under reduced motion. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse dark:bg-amber-400",
        className,
      )}
    />
  );
}
