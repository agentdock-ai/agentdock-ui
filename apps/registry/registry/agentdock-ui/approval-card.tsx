import { Fragment, useMemo, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { cloneJsonValue } from "@agentdock-ai/contracts";
import { ChatIcon } from "./icon.js";
import type { JsonValue, RenderApproval } from "@agentdock-ai/ui-core";
import { ErrorState } from "./error-state.js";
import { Button } from "../ui/button.js";
export function ApprovalCard({
  approval,
  enabled,
  pending,
  error,
  onRespond,
}: {
  approval: RenderApproval;
  enabled: boolean;
  pending: boolean;
  error?: string;
  onRespond: (decisions: readonly JsonValue[]) => void;
}) {
  const resolved = approval.state === "resolved";
  const initialEdits = useMemo(
    () =>
      Object.fromEntries(
        approval.actions.map((action) => [
          action.id,
          JSON.stringify(action.input, null, 2),
        ]),
      ),
    [approval.actions],
  );
  const [edits, setEdits] = useState(initialEdits);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const locked = !enabled || pending;
  const toolApproval = approval.kind === "tool-approval";
  const hasActions = approval.actions.length > 0;
  const plural = approval.actions.length > 1 ? " all" : "";

  function submitEdits() {
    try {
      const decisions = approval.actions.map((action) => {
        const args = cloneJsonValue(JSON.parse(edits[action.id] ?? ""));
        if (typeof args !== "object" || args === null || Array.isArray(args))
          throw new Error("Edited arguments must be a JSON object.");
        return { type: "edit", editedAction: { name: action.label, args } };
      });
      setEditError(null);
      onRespond(decisions);
    } catch (cause) {
      setEditError(
        cause instanceof Error ? cause.message : "Enter valid JSON arguments.",
      );
    }
  }
  function cancelEdits() {
    setEdits(initialEdits);
    setEditError(null);
    setEditing(false);
  }

  if (resolved)
    return (
      <section aria-label={approval.title} className="min-w-0 px-1">
        <div className="flex min-h-7 min-w-0 items-center gap-2 text-[13px] leading-5 text-muted-foreground">
          <ChatIcon icon={Check} size={13} aria-hidden="true" />
          <h3 className="shrink-0 text-foreground">Response received</h3>
          <p className="min-w-0 truncate">{approval.detail}</p>
        </div>
        {error && (
          <div className="mt-2">
            <ErrorState title="Response not confirmed" detail={error} />
          </div>
        )}
      </section>
    );

  const hint = !toolApproval
    ? "This app has no response control for this native interrupt."
    : pending
      ? "Sending your response…"
      : !enabled
        ? "This app can’t respond to this request here."
        : !hasActions
          ? "Continue this request in the app."
          : "The agent is paused until you respond.";

  return (
    <section
      aria-label={approval.title}
      className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]"
    >
      <div className="flex items-center gap-2">
        <ChatIcon
          icon={ShieldCheck}
          size={15}
          aria-hidden="true"
          className="text-muted-foreground"
        />
        <h3 className="min-w-0 text-[14px] font-medium leading-5">
          {approval.title}
        </h3>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.6] text-muted-foreground [overflow-wrap:anywhere]">
        {approval.detail}
      </p>
      {toolApproval && hasActions && (
        <ul className="mt-3 space-y-1.5">
          {approval.actions.map((action) => (
            <li
              key={action.id}
              className="min-w-0 rounded-lg bg-muted/50 px-3 py-2"
            >
              {editing ? (
                <label className="block min-w-0">
                  <span className="block text-[12.5px] font-medium leading-5">
                    {action.label}
                  </span>
                  <textarea
                    aria-label={`${action.label} arguments`}
                    spellCheck={false}
                    className="mt-1.5 min-h-24 w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-[12px] leading-5 text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring/60 focus:ring-4 focus:ring-ring/10 disabled:opacity-60 motion-reduce:transition-none"
                    value={edits[action.id] ?? "{}"}
                    disabled={locked}
                    onChange={(event) =>
                      setEdits((current) => ({
                        ...current,
                        [action.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : (
                <>
                  <p className="text-[12.5px] font-medium leading-5">
                    {action.label}
                  </p>
                  <Arguments
                    label={`${action.label} arguments`}
                    value={action.input}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {editError && (
        <p role="alert" className="mt-2 text-xs leading-5 text-destructive">
          {editError}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <ErrorState title="Response not confirmed" detail={error} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="min-w-0 flex-1 basis-48 text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
        {toolApproval && hasActions && (
          <div className="flex flex-wrap items-center gap-1.5">
            {editing ? (
              <Fragment key="editing">
                <Button disabled={locked} onClick={cancelEdits}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={locked}
                  onClick={submitEdits}
                >
                  Submit edits
                </Button>
              </Fragment>
            ) : (
              <Fragment key="reviewing">
                <Button disabled={locked} onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  disabled={locked}
                  onClick={() =>
                    onRespond(approval.actions.map(() => ({ type: "reject" })))
                  }
                >
                  Reject{plural}
                </Button>
                <Button
                  variant="primary"
                  disabled={locked}
                  onClick={() =>
                    onRespond(approval.actions.map(() => ({ type: "approve" })))
                  }
                >
                  Approve{plural}
                </Button>
              </Fragment>
            )}
          </div>
        )}
      </div>
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
      className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-[12px] leading-5"
    >
      {entries.map(([key, entry]) => (
        <Fragment key={key}>
          <dt className="text-muted-foreground">{key}</dt>
          <dd className="min-w-0 text-foreground/80 [overflow-wrap:anywhere]">
            {typeof entry === "string" ? entry : JSON.stringify(entry)}
          </dd>
        </Fragment>
      ))}
    </dl>
  ) : (
    <pre
      aria-label={label}
      className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-5 text-foreground/80 [overflow-wrap:anywhere]"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
