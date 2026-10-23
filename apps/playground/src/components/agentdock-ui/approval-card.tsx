"use client";
import {
  Fragment,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, Clock, Pencil, X, type LucideIcon } from "lucide-react";
import { cloneJsonValue, type JsonValue } from "@agentdock-ai/contracts";
import type {
  RenderApproval,
  RenderApprovalAction,
} from "@agentdock-ai/ui-core";
import { AlertStatus, Kbd, PulseDot, toneText } from "./alert";
import { ChatIcon } from "./icon";
import { ErrorState } from "./error-state";
import { Button } from "./ui/button";
import { cn } from "./utils";

export type ToolRisk = "low" | "medium" | "high";
type Decision = "approve" | "edit" | "reject";
const decisionTypes: Decision[] = ["approve", "edit", "reject"];
const decisionLabels: Record<Decision, string> = {
  approve: "Approve",
  edit: "Edit",
  reject: "Reject",
};
const decisionIcons: Record<Decision, LucideIcon> = {
  approve: Check,
  edit: Pencil,
  reject: X,
};

/** Ticks once a second while `active`; null before mount so server output is stable. */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
function timeLeft(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")} left`;
}
const isTyping = (target: EventTarget) =>
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement;

export function RiskLabel({ risk }: { risk: ToolRisk }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        risk === "high"
          ? toneText.error
          : risk === "medium"
            ? toneText.warning
            : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          risk === "low" ? "border border-current" : "bg-current",
        )}
      />
      {risk === "high" ? "High" : risk === "medium" ? "Medium" : "Low"} risk
    </span>
  );
}

export function ApprovalCard({
  approval,
  enabled,
  pending,
  error,
  errorCode,
  onRespond,
  riskOf,
  expiresAt,
}: {
  approval: RenderApproval;
  enabled: boolean;
  pending: boolean;
  error?: string;
  errorCode?: string;
  onRespond: (decisions: readonly JsonValue[]) => void;
  /** App-defined risk per tool name; unlabelled tools show no risk. */
  riskOf?: (toolName: string) => ToolRisk | undefined;
  /** Epoch milliseconds after which only Reject stays available. */
  expiresAt?: number;
}) {
  const resolved = approval.state === "resolved";
  const [choices, setChoices] = useState<Record<string, Decision>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const now = useNow(expiresAt !== undefined && !resolved);
  const expired = expiresAt !== undefined && now !== null && now >= expiresAt;
  const locked = !enabled || pending;
  const toolApproval = approval.kind === "tool-approval";
  const actions = approval.actions;
  const single = actions.length === 1;
  const allowed = (action: RenderApprovalAction) => {
    const types = action.allowedDecisions ?? decisionTypes;
    return expired ? types.filter((type) => type === "reject") : types;
  };
  const selected = (action: RenderApprovalAction) => {
    const choice = choices[action.id];
    if (choice && allowed(action).includes(choice)) return choice;
    if (allowed(action).includes("approve")) return "approve";
    return allowed(action)[0];
  };
  const disabled =
    locked ||
    actions.length === 0 ||
    actions.some((action) => allowed(action).length === 0);
  const every = (type: Decision) =>
    actions.length > 0 &&
    actions.every((action) => allowed(action).includes(type));

  function decision(action: RenderApprovalAction, type: Decision): JsonValue {
    if (type === "edit") {
      const args = cloneJsonValue(
        JSON.parse(edits[action.id] ?? JSON.stringify(action.input)),
      );
      if (typeof args !== "object" || args === null || Array.isArray(args))
        throw new Error("Edited arguments must be a JSON object.");
      return { type: "edit", editedAction: { name: action.label, args } };
    }
    const message = reasons[action.id]?.trim();
    return type === "reject" && message ? { type, message } : { type };
  }
  function respond(override?: Decision) {
    if (disabled) return;
    try {
      const decisions = actions.map((action): JsonValue => {
        const type = override ?? selected(action);
        if (!type || !allowed(action).includes(type))
          throw new Error("That decision isn’t available for this action.");
        return decision(action, type);
      });
      setEditError(null);
      onRespond(decisions);
    } catch (cause) {
      setEditError(
        cause instanceof Error ? cause.message : "Enter valid JSON arguments.",
      );
    }
  }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled || event.defaultPrevented) return;
    const target = event.target;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      respond(single ? (editing ? "edit" : "approve") : undefined);
      return;
    }
    if (!single || target instanceof HTMLButtonElement) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (editing) setEditing(false);
      else if (allowed(actions[0]!).includes("reject")) respond("reject");
    } else if (event.key === "Enter" && !isTyping(target)) {
      event.preventDefault();
      if (allowed(actions[0]!).includes("approve")) respond("approve");
    }
  }

  const failure = error && (
    <ErrorState
      title="Your response wasn’t confirmed"
      detail={error}
      code={errorCode}
      actions={
        errorCode === "approval_expired" &&
        !resolved &&
        every("reject") && (
          <Button
            variant="primary"
            disabled={locked}
            onClick={() => respond("reject")}
          >
            Reject and continue
          </Button>
        )
      }
    />
  );

  if (resolved) return <Resolved approval={approval}>{failure}</Resolved>;

  const status = expired ? (
    <AlertStatus tone="warning" icon={Clock}>
      Expired
    </AlertStatus>
  ) : (
    <AlertStatus
      marker={<PulseDot />}
      meta={
        expiresAt !== undefined &&
        now !== null && (
          <span
            className={cn(
              expiresAt - now < 120_000 && cn("font-medium", toneText.warning),
            )}
          >
            {timeLeft(expiresAt - now)}
          </span>
        )
      }
    >
      <span className="font-normal">
        {single ? (
          "Waiting for your approval"
        ) : (
          <>
            <span className="font-medium text-foreground">
              {actions.length} actions
            </span>{" "}
            waiting for your approval
          </>
        )}
      </span>
    </AlertStatus>
  );
  const hint = pending
    ? "Sending your response…"
    : !toolApproval
      ? "This app has no response control for this request."
      : !enabled
        ? "This app can’t respond to this request here."
        : expired
          ? "This approval expired. You can still reject it."
          : actions.length === 0
            ? "Continue this request in the app."
            : single && !allowed(actions[0]!).includes("edit")
              ? "Approve or reject. Editing isn’t allowed."
              : "The agent is paused until you respond.";
  const counts = actions.reduce<Record<Decision, number>>(
    (total, action) => {
      const type = selected(action);
      if (type) total[type] += 1;
      return total;
    },
    { approve: 0, edit: 0, reject: 0 },
  );
  const summary = [
    counts.approve && `${counts.approve} approved`,
    counts.edit && `${counts.edit} edited`,
    counts.reject && `${counts.reject} rejected`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section
        aria-label={approval.title}
        tabIndex={toolApproval && !disabled ? 0 : undefined}
        onKeyDown={onKeyDown}
        className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {single && toolApproval ? (
          <SingleAction
            action={actions[0]!}
            fallbackTitle={approval.detail}
            status={status}
            risk={riskOf?.(actions[0]!.label)}
            editing={editing}
            locked={locked}
            edit={edits[actions[0]!.id]}
            onEdit={(value) =>
              setEdits((current) => ({ ...current, [actions[0]!.id]: value }))
            }
          />
        ) : (
          <>
            <div className="px-[18px] py-3.5">{status}</div>
            {toolApproval && actions.length > 0 ? (
              <ul className="flex flex-col">
                {actions.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    risk={riskOf?.(action.label)}
                    allowed={allowed(action)}
                    selected={selected(action)}
                    locked={locked}
                    edit={edits[action.id]}
                    reason={reasons[action.id] ?? ""}
                    onSelect={(type) =>
                      setChoices((current) => ({
                        ...current,
                        [action.id]: type,
                      }))
                    }
                    onEdit={(value) =>
                      setEdits((current) => ({
                        ...current,
                        [action.id]: value,
                      }))
                    }
                    onReason={(value) =>
                      setReasons((current) => ({
                        ...current,
                        [action.id]: value,
                      }))
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="border-t border-border px-[18px] py-3 text-[13px] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                {approval.detail}
              </p>
            )}
          </>
        )}
        {editError && (
          <p
            role="alert"
            className="px-[18px] pb-3 text-xs leading-5 text-destructive"
          >
            {editError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 py-2.5 pl-[18px] pr-3">
          <p className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">
            {!single && toolApproval && actions.length > 0 && !pending
              ? summary
              : hint}
          </p>
          {toolApproval && actions.length > 0 && single && (
            <>
              {editing ? (
                <Fragment key="editing">
                  <Button disabled={locked} onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={disabled}
                    onClick={() => respond("edit")}
                  >
                    Save and approve <Kbd onPrimary>⌘↵</Kbd>
                  </Button>
                </Fragment>
              ) : (
                <Fragment key="reviewing">
                  {allowed(actions[0]!).includes("edit") && (
                    <Button
                      disabled={disabled}
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </Button>
                  )}
                  {allowed(actions[0]!).includes("reject") && (
                    <Button
                      variant="outline"
                      disabled={disabled}
                      aria-keyshortcuts="Escape"
                      onClick={() => respond("reject")}
                    >
                      Reject <Kbd>Esc</Kbd>
                    </Button>
                  )}
                  {allowed(actions[0]!).includes("approve") && (
                    <Button
                      variant="primary"
                      disabled={disabled}
                      aria-keyshortcuts="Enter"
                      onClick={() => respond("approve")}
                    >
                      Approve <Kbd onPrimary>↵</Kbd>
                    </Button>
                  )}
                </Fragment>
              )}
            </>
          )}
          {toolApproval && actions.length > 0 && !single && (
            <>
              {every("reject") && (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => respond("reject")}
                >
                  Reject all
                </Button>
              )}
              {every("approve") && (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => respond("approve")}
                >
                  Approve all
                </Button>
              )}
              <Button
                variant="primary"
                disabled={disabled}
                aria-keyshortcuts="Control+Enter Meta+Enter"
                onClick={() => respond()}
              >
                Submit <Kbd onPrimary>⌘↵</Kbd>
              </Button>
            </>
          )}
        </div>
      </section>
      {failure}
    </div>
  );
}

function SingleAction({
  action,
  fallbackTitle,
  status,
  risk,
  editing,
  locked,
  edit,
  onEdit,
}: {
  action: RenderApprovalAction;
  fallbackTitle: string;
  status: ReactNode;
  risk?: ToolRisk;
  editing: boolean;
  locked: boolean;
  edit?: string;
  onEdit: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5 px-[18px] pb-[18px] pt-4">
      {status}
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-[15px] font-semibold leading-[22px] tracking-[-0.01em] [overflow-wrap:anywhere]">
          {action.description || fallbackTitle || action.label}
        </h3>
        <p className="flex flex-wrap items-center gap-2 text-xs leading-[18px] text-muted-foreground">
          <span className="font-mono">{action.label}</span>
          {risk && (
            <>
              <span aria-hidden="true">·</span>
              <RiskLabel risk={risk} />
            </>
          )}
        </p>
      </div>
      {editing ? (
        <ArgumentsEditor
          action={action}
          value={edit}
          locked={locked}
          onChange={onEdit}
        />
      ) : (
        <Arguments label={`${action.label} arguments`} value={action.input} />
      )}
    </div>
  );
}

function ActionRow({
  action,
  risk,
  allowed,
  selected,
  locked,
  edit,
  reason,
  onSelect,
  onEdit,
  onReason,
}: {
  action: RenderApprovalAction;
  risk?: ToolRisk;
  allowed: readonly Decision[];
  selected?: Decision;
  locked: boolean;
  edit?: string;
  reason: string;
  onSelect: (type: Decision) => void;
  onEdit: (value: string) => void;
  onReason: (value: string) => void;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2.5 border-t border-border px-[18px] pb-3.5 pt-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-mono text-[13px] font-medium leading-5">
            {action.label}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
            {action.description && <span>{action.description}</span>}
            {action.description && risk && <span aria-hidden="true">·</span>}
            {risk && <RiskLabel risk={risk} />}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label={`${action.label} decision`}
          className="flex shrink-0 gap-0.5 rounded-lg border border-border p-0.5"
        >
          {allowed.map((type) => (
            <label
              key={type}
              title={decisionLabels[type]}
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60 motion-reduce:transition-none",
                selected === type &&
                  (type === "reject"
                    ? "bg-destructive/10 text-destructive hover:text-destructive"
                    : "bg-foreground/10 text-foreground"),
                locked && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="radio"
                name={`${action.id}-decision`}
                value={type}
                aria-label={decisionLabels[type]}
                checked={selected === type}
                disabled={locked}
                onChange={() => onSelect(type)}
                className="sr-only"
              />
              <ChatIcon icon={decisionIcons[type]} size={14} />
            </label>
          ))}
        </div>
      </div>
      {selected === "edit" ? (
        <ArgumentsEditor
          action={action}
          value={edit}
          locked={locked}
          onChange={onEdit}
        />
      ) : selected === "reject" ? (
        <label className="flex min-w-0 items-center gap-2.5 text-xs leading-4 text-muted-foreground">
          <span className="shrink-0">Reason</span>
          <input
            type="text"
            value={reason}
            disabled={locked}
            placeholder="Optional, sent to the agent"
            onChange={(event) => onReason(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-muted/30 px-2.5 text-[12.5px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring/60 focus:ring-4 focus:ring-ring/10 disabled:opacity-60 motion-reduce:transition-none"
          />
        </label>
      ) : (
        <Arguments label={`${action.label} arguments`} value={action.input} />
      )}
    </li>
  );
}

function ArgumentsEditor({
  action,
  value,
  locked,
  onChange,
}: {
  action: RenderApprovalAction;
  value?: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs leading-4 text-muted-foreground">
      <span className="flex justify-between gap-3">
        <span>Edit arguments</span>
        <span>
          Tool stays <span className="font-mono">{action.label}</span>
        </span>
      </span>
      <textarea
        aria-label={`${action.label} arguments`}
        spellCheck={false}
        value={value ?? JSON.stringify(action.input, null, 2)}
        disabled={locked}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full resize-y rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px] leading-[19px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring/60 focus:ring-4 focus:ring-ring/10 disabled:opacity-60 motion-reduce:transition-none"
      />
    </label>
  );
}

function Resolved({
  approval,
  children,
}: {
  approval: RenderApproval;
  children?: ReactNode;
}) {
  const rows =
    approval.decisions.length === approval.actions.length &&
    approval.actions.length > 0
      ? approval.actions.map((action, index) => {
          const raw = approval.decisions[index];
          const value =
            raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          const type =
            value.type === "edit" || value.type === "reject"
              ? value.type
              : "approve";
          const message =
            typeof value.message === "string" ? value.message : undefined;
          return { action, type, message } as const;
        })
      : null;
  return (
    <section
      aria-label={approval.title}
      className="flex min-w-0 flex-col gap-2"
    >
      <ul className="flex min-w-0 flex-col px-1">
        {rows ? (
          rows.map(({ action, type, message }, index) => (
            <li
              key={action.id}
              className={cn(
                "flex min-h-9 min-w-0 items-center gap-2.5 text-[13px] leading-5",
                index > 0 && "border-t border-border",
              )}
            >
              <ChatIcon
                icon={decisionIcons[type]}
                size={14}
                className={
                  type === "reject"
                    ? toneText.error
                    : type === "edit"
                      ? "text-foreground"
                      : toneText.success
                }
              />
              <span className="shrink-0">
                {type === "approve"
                  ? "Approved"
                  : type === "edit"
                    ? "Edited, then approved"
                    : "Rejected"}
              </span>
              <span className="min-w-0 truncate font-mono text-[12.5px] text-muted-foreground">
                {action.label}
              </span>
              {message && (
                <span className="min-w-0 truncate text-muted-foreground">
                  · “{message}”
                </span>
              )}
            </li>
          ))
        ) : (
          <li className="flex min-h-9 min-w-0 items-center gap-2.5 text-[13px] leading-5">
            <ChatIcon icon={Check} size={14} className={toneText.success} />
            <span className="shrink-0">Response received</span>
            <span className="min-w-0 truncate text-muted-foreground">
              {approval.detail}
            </span>
          </li>
        )}
      </ul>
      {children}
    </section>
  );
}

/** Object arguments read as a key/value list; anything else falls back to JSON. */
function Arguments({ label, value }: { label: string; value: JsonValue }) {
  const entries =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? Object.entries(value)
      : null;
  if (entries?.length === 0) return null;
  return entries ? (
    <dl
      aria-label={label}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12.5px] leading-5"
    >
      {entries.map(([key, entry]) => (
        <Fragment key={key}>
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="min-w-0 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
            {typeof entry === "string" ? entry : JSON.stringify(entry)}
          </dd>
        </Fragment>
      ))}
    </dl>
  ) : (
    <pre
      aria-label={label}
      className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12.5px] leading-5 [overflow-wrap:anywhere]"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
