"use client";
import { useState, type ReactNode } from "react";
import { Clock, WifiOff } from "lucide-react";
import type { RenderErrorScope } from "@agentdock-ai/ui-core";
import { Alert, type AlertTone } from "./alert";
import { Button } from "./ui/button";
import { errorDetail, safeDiagnosticText } from "./utils";

interface KnownError {
  tone: AlertTone;
  status: string;
  icon?: typeof Clock;
  title?: string;
  detail?: string;
}
/** Friendly wording for codes the server sends; unknown codes keep the caller’s text. */
const knownCodes: Record<string, KnownError> = {
  approval_expired: {
    tone: "warning",
    status: "Expired",
    icon: Clock,
    title: "This approval can no longer be given",
    detail:
      "It waited longer than the app allows. Reject it so the agent can move on, or ask it to propose the action again.",
  },
  thread_busy: {
    tone: "info",
    status: "Busy",
    title: "Another run is active",
    detail:
      "This conversation is already running, possibly in another tab. Wait for it to finish or stop it, then try again.",
  },
  client_stalled: { tone: "warning", status: "Connection", icon: WifiOff },
  network_error: { tone: "warning", status: "Connection", icon: WifiOff },
  transport_error: { tone: "warning", status: "Connection", icon: WifiOff },
};
const scopeStatus: Record<RenderErrorScope, string> = {
  run: "Run failed",
  tool: "Tool failed",
  transport: "Connection",
};

export function ErrorState({
  title,
  detail,
  code,
  scope,
  retryable,
  onRetry,
  retryLabel = "Retry",
  actions,
}: {
  title: string;
  detail: string;
  code?: string;
  scope?: RenderErrorScope;
  /** When false, Retry stays hidden even if `onRetry` is supplied. */
  retryable?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra footer actions, placed before Retry. */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const known = code ? knownCodes[code] : undefined;
  const tone =
    known?.tone ?? (scope === "transport" ? "warning" : ("error" as const));
  const status = known?.status ?? (scope ? scopeStatus[scope] : "Error");
  const heading = known?.title ?? title;
  const message = errorDetail(known?.detail ?? detail);
  const showMessage = message && message !== heading;
  const report = [
    code && `code: ${code}`,
    scope && `scope: ${scope}`,
    `message: ${safeDiagnosticText(detail)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const canRetry = Boolean(onRetry) && retryable !== false;
  const hasDetails = Boolean(code || scope);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(report);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Alert
      tone={tone}
      status={status}
      icon={known?.icon}
      meta={code}
      title={heading}
      details={
        open && (
          <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px] leading-[18px]">
            {code && (
              <>
                <dt className="text-muted-foreground">code</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">{code}</dd>
              </>
            )}
            {scope && (
              <>
                <dt className="text-muted-foreground">scope</dt>
                <dd>{scope}</dd>
              </>
            )}
            <dt className="text-muted-foreground">message</dt>
            <dd className="min-w-0 [overflow-wrap:anywhere]">
              {safeDiagnosticText(detail)}
            </dd>
          </dl>
        )
      }
      hint={
        hasDetails && (
          <span className="flex items-center gap-3">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className="rounded font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {open ? "Hide details" : "Show details"}
            </button>
            {open && (
              <button
                type="button"
                onClick={() => {
                  void copy();
                }}
                className="rounded font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </span>
        )
      }
      actions={
        (actions || canRetry) && (
          <>
            {actions}
            {canRetry && (
              <Button variant="primary" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
          </>
        )
      }
    >
      {showMessage && message}
    </Alert>
  );
}
