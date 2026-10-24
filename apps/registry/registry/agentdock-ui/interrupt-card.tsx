"use client";
import { useId, useState, type KeyboardEvent } from "react";
import { Check, Pause } from "lucide-react";
import type { JsonValue, RenderApproval } from "@agentdock-ai/ui-core";
import { Alert, AlertStatus, Kbd, PulseDot } from "./alert.js";
import { ErrorState } from "./error-state.js";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
import { cn, formatJson } from "./utils.js";

type Primitive = "string" | "number" | "integer" | "boolean";
interface Option {
  value: string | number;
  label: string;
  description?: string;
}
export interface AnswerField {
  name: string;
  label: string;
  type: Primitive;
  required: boolean;
  options?: readonly Option[];
  format?: string;
}
export type AnswerFormat =
  | { kind: "confirm" }
  | { kind: "choice"; options: readonly Option[] }
  | { kind: "text"; maxLength?: number }
  | { kind: "form"; fields: readonly AnswerField[] };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function options(schema: Record<string, unknown>): Option[] | undefined {
  if (Array.isArray(schema.enum) && schema.enum.length > 0)
    return schema.enum.every(
      (item) => typeof item === "string" || typeof item === "number",
    )
      ? schema.enum.map((item) => ({ value: item, label: String(item) }))
      : undefined;
  const choices = Array.isArray(schema.oneOf) ? schema.oneOf : schema.anyOf;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const result: Option[] = [];
  for (const choice of choices) {
    if (
      !record(choice) ||
      (typeof choice.const !== "string" && typeof choice.const !== "number")
    )
      return undefined;
    result.push({
      value: choice.const,
      label:
        typeof choice.title === "string" ? choice.title : String(choice.const),
      ...(typeof choice.description === "string"
        ? { description: choice.description }
        : {}),
    });
  }
  return result;
}
const primitive = (type: unknown): type is Primitive =>
  type === "string" ||
  type === "number" ||
  type === "integer" ||
  type === "boolean";

/** Map a JSON Schema to controls this card can render; null means read-only. */
export function answerFormat(
  schema: JsonValue | undefined,
): AnswerFormat | null {
  if (!record(schema)) return null;
  const choices = options(schema);
  if (choices) return { kind: "choice", options: choices };
  if (schema.type === "boolean") return { kind: "confirm" };
  if (schema.type === "string")
    return {
      kind: "text",
      ...(typeof schema.maxLength === "number"
        ? { maxLength: schema.maxLength }
        : {}),
    };
  if (schema.type !== "object" || !record(schema.properties)) return null;
  const required = Array.isArray(schema.required) ? schema.required : [];
  const fields: AnswerField[] = [];
  for (const [name, property] of Object.entries(schema.properties)) {
    if (!record(property)) return null;
    const fieldOptions = options(property);
    const type = fieldOptions ? "string" : property.type;
    if (!primitive(type)) return null;
    fields.push({
      name,
      label: typeof property.title === "string" ? property.title : name,
      type,
      required: required.includes(name),
      ...(fieldOptions ? { options: fieldOptions } : {}),
      ...(typeof property.format === "string"
        ? { format: property.format }
        : {}),
    });
  }
  return fields.length > 0 ? { kind: "form", fields } : null;
}

const kindLabel = {
  confirm: "yes / no",
  choice: "choice",
  text: "text",
  form: "form",
} as const;
const fieldClass =
  "h-8 w-full min-w-0 rounded-lg border border-border bg-muted/30 px-2.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring/60 focus:ring-4 focus:ring-ring/10 disabled:opacity-60 motion-reduce:transition-none";

/** Answers a custom interrupt using controls built from its response schema. */
export function InterruptCard({
  approval,
  enabled,
  pending,
  error,
  errorCode,
  onAnswer,
}: {
  approval: RenderApproval;
  enabled: boolean;
  pending: boolean;
  error?: string;
  errorCode?: string;
  /** Omit when the app can’t answer here; the card then shows a read-only view. */
  onAnswer?: (value: JsonValue) => void;
}) {
  const id = useId();
  const format = onAnswer ? answerFormat(approval.responseSchema) : null;
  const [choice, setChoice] = useState<string | number | undefined>(
    format?.kind === "choice" ? format.options[0]?.value : undefined,
  );
  const [text, setText] = useState("");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const locked = !enabled || pending;
  const failure = error && (
    <ErrorState
      title="Your answer wasn’t confirmed"
      detail={error}
      code={errorCode}
    />
  );

  if (approval.state === "resolved")
    return (
      <div className="flex min-w-0 flex-col gap-2 px-1">
        <p className="flex min-h-7 min-w-0 items-center gap-2 text-[13px] leading-5">
          <ChatIcon
            icon={Check}
            size={14}
            className="text-emerald-700 dark:text-emerald-400"
          />
          <span>Answered</span>
          <span className="min-w-0 truncate text-muted-foreground">
            {approval.detail}
          </span>
        </p>
        {failure}
      </div>
    );

  if (!format)
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <Alert
          tone="neutral"
          status="Waiting on your app"
          icon={Pause}
          meta={
            record(approval.payload) &&
            typeof approval.payload.type === "string"
              ? approval.payload.type
              : undefined
          }
          title="Answer this where the run started"
          quiet
          details={
            approval.payload !== undefined && (
              <pre
                tabIndex={0}
                aria-label="Interrupt payload"
                className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px] leading-[19px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [overflow-wrap:anywhere]"
              >
                {formatJson(approval.payload)}
              </pre>
            )
          }
        >
          {approval.detail ||
            "The agent asked for something this screen can’t provide."}
        </Alert>
        {failure}
      </div>
    );

  function build(): JsonValue | undefined {
    if (!format) return undefined;
    if (format.kind === "choice") return choice ?? null;
    if (format.kind === "text") {
      if (!text.trim()) {
        setProblem("Write an answer first.");
        return undefined;
      }
      return text;
    }
    if (format.kind !== "form") return undefined;
    const answer: Record<string, JsonValue> = {};
    for (const field of format.fields) {
      const raw = values[field.name];
      if (field.type === "boolean") {
        answer[field.name] = raw === true;
        continue;
      }
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) {
        if (field.required) {
          setProblem(`${field.label} is required.`);
          return undefined;
        }
        continue;
      }
      if (field.type === "number" || field.type === "integer") {
        const number = Number(value);
        if (
          !Number.isFinite(number) ||
          (field.type === "integer" && !Number.isInteger(number))
        ) {
          setProblem(`${field.label} must be a number.`);
          return undefined;
        }
        answer[field.name] = number;
      } else if (field.format === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
        setProblem(`${field.label} must be an email address.`);
        return undefined;
      } else if (field.options) {
        const option = field.options.find(
          (item) => String(item.value) === value,
        );
        answer[field.name] = option ? option.value : value;
      } else answer[field.name] = value;
    }
    return answer;
  }
  function send(value?: JsonValue) {
    if (locked) return;
    const answer = value ?? build();
    if (answer === undefined) return;
    setProblem(null);
    onAnswer?.(answer);
  }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (locked || event.defaultPrevented) return;
    const typing =
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      send();
    } else if (format?.kind === "confirm" && !typing) {
      if (event.key === "y" || event.key === "Y") send(true);
      if (event.key === "n" || event.key === "N") send(false);
    }
  }

  const sendButton = (
    <Button variant="primary" disabled={locked} onClick={() => send()}>
      {pending ? "Sending…" : "Send"}
      <Kbd onPrimary>⌘↵</Kbd>
    </Button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section
        aria-label={approval.detail || approval.title}
        onKeyDown={onKeyDown}
        className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]"
      >
        <div className="flex min-w-0 flex-col gap-3.5 px-[18px] pb-[18px] pt-4">
          <AlertStatus marker={<PulseDot />} meta={kindLabel[format.kind]}>
            <span className="font-normal">Waiting for your answer</span>
          </AlertStatus>
          {format.kind === "text" ? (
            <label className="flex flex-col gap-2.5">
              <span className="text-[15px] font-semibold leading-[22px] tracking-[-0.01em]">
                {approval.detail || approval.title}
              </span>
              <textarea
                value={text}
                disabled={locked}
                maxLength={format.maxLength}
                placeholder="Write your answer…"
                onChange={(event) => setText(event.target.value)}
                className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[13px] leading-5 text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-ring/60 focus:ring-4 focus:ring-ring/10 disabled:opacity-60 motion-reduce:transition-none"
              />
            </label>
          ) : (
            <h3 className="text-[15px] font-semibold leading-[22px] tracking-[-0.01em] [overflow-wrap:anywhere]">
              {approval.detail || approval.title}
            </h3>
          )}
          {format.kind === "choice" && (
            <div
              role="radiogroup"
              aria-label={approval.detail || "Choices"}
              className="flex flex-col overflow-hidden rounded-lg border border-border"
            >
              {format.options.map((option, index) => (
                <label
                  key={String(option.value)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 px-3 py-2.5",
                    index > 0 && "border-t border-border",
                    choice === option.value && "bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-choice`}
                    checked={choice === option.value}
                    disabled={locked}
                    onChange={() => setChoice(option.value)}
                    className="mt-[3px] accent-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] font-medium leading-5">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="text-[12.5px] leading-[18px] text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
          {format.kind === "form" && (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {format.fields.map((field) =>
                field.type === "boolean" ? (
                  <label
                    key={field.name}
                    className="flex items-center gap-2 text-[13px] leading-5 sm:col-span-2"
                  >
                    <input
                      type="checkbox"
                      checked={values[field.name] === true}
                      disabled={locked}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: event.target.checked,
                        }))
                      }
                      className="accent-foreground"
                    />
                    {field.label}
                  </label>
                ) : (
                  <label
                    key={field.name}
                    className="flex min-w-0 flex-col gap-1.5 text-xs leading-4 text-muted-foreground"
                  >
                    <span>
                      {field.label}
                      {field.required && <span aria-hidden="true"> *</span>}
                    </span>
                    {field.options ? (
                      <select
                        value={
                          typeof values[field.name] === "string"
                            ? (values[field.name] as string)
                            : ""
                        }
                        required={field.required}
                        disabled={locked}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }))
                        }
                        className={fieldClass}
                      >
                        <option value="">Choose…</option>
                        {field.options.map((option) => (
                          <option
                            key={String(option.value)}
                            value={String(option.value)}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.format === "email"
                            ? "email"
                            : field.type === "string"
                              ? "text"
                              : "number"
                        }
                        value={
                          typeof values[field.name] === "string"
                            ? (values[field.name] as string)
                            : ""
                        }
                        required={field.required}
                        disabled={locked}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }))
                        }
                        className={fieldClass}
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          )}
          {problem && (
            <p role="alert" className="text-xs leading-5 text-destructive">
              {problem}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 py-2.5 pl-[18px] pr-3">
          <p className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">
            {pending
              ? "Sending your answer…"
              : !enabled
                ? "This app can’t answer this request here."
                : format.kind === "text"
                  ? `${text.length}${format.maxLength ? ` / ${format.maxLength}` : ""}`
                  : "The agent is paused until you answer."}
          </p>
          {format.kind === "confirm" ? (
            <>
              <Button
                variant="outline"
                disabled={locked}
                onClick={() => send(false)}
              >
                No <Kbd>N</Kbd>
              </Button>
              <Button
                variant="primary"
                disabled={locked}
                onClick={() => send(true)}
              >
                Yes, continue <Kbd onPrimary>Y</Kbd>
              </Button>
            </>
          ) : (
            sendButton
          )}
        </div>
      </section>
      {failure}
    </div>
  );
}
