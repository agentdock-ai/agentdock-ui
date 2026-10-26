// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JsonValue } from "@agentdock-ai/contracts";
import type { RenderApproval } from "@agentdock-ai/ui-core";
import {
  InterruptCard,
  answerFormat,
} from "../../../apps/registry/registry/agentdock-ui/interrupt-card.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
let answers: JsonValue[];
const interrupt = (
  responseSchema?: JsonValue,
  payload?: JsonValue,
): RenderApproval => ({
  interruptId: "q",
  kind: "custom",
  title: "Your input is needed",
  detail: "Which environment?",
  state: "pending",
  decisions: [],
  actions: [],
  ...(responseSchema === undefined ? {} : { responseSchema }),
  ...(payload === undefined ? {} : { payload }),
});
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  answers = [];
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(
  approval: RenderApproval,
  { answerable = true, enabled = true } = {},
) {
  await act(async () =>
    root.render(
      <InterruptCard
        approval={approval}
        enabled={enabled}
        pending={false}
        onAnswer={answerable ? (value) => answers.push(value) : undefined}
      />,
    ),
  );
}
async function click(text: string) {
  const target = [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.startsWith(text),
  );
  if (!target) throw new Error(`Missing button ${text}`);
  await act(async () => target.click());
}
async function type(element: Element, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("answerFormat", () => {
  it("maps supported schemas to controls", () => {
    expect(answerFormat({ type: "boolean" })).toEqual({ kind: "confirm" });
    expect(answerFormat({ type: "string", maxLength: 10 })).toEqual({
      kind: "text",
      maxLength: 10,
    });
    expect(answerFormat({ enum: ["a", 2] })).toEqual({
      kind: "choice",
      options: [
        { value: "a", label: "a" },
        { value: 2, label: "2" },
      ],
    });
    expect(
      answerFormat({
        oneOf: [{ const: "s", title: "Staging", description: "Safe" }],
      }),
    ).toEqual({
      kind: "choice",
      options: [{ value: "s", label: "Staging", description: "Safe" }],
    });
    expect(
      answerFormat({
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", title: "Email" },
          count: { type: "integer" },
          level: { enum: ["low", "high"] },
        },
      }),
    ).toEqual({
      kind: "form",
      fields: [
        {
          name: "email",
          label: "Email",
          type: "string",
          required: true,
          format: "email",
        },
        { name: "count", label: "count", type: "integer", required: false },
        {
          name: "level",
          label: "level",
          type: "string",
          required: false,
          options: [
            { value: "low", label: "low" },
            { value: "high", label: "high" },
          ],
        },
      ],
    });
  });

  it.each([
    undefined,
    null,
    "text",
    { type: "array" },
    { enum: [] },
    { enum: [{ nested: true }] },
    { oneOf: [{ title: "No const" }] },
    { type: "object", properties: { nested: { type: "object" } } },
    { type: "object", properties: {} },
  ] as (JsonValue | undefined)[])("leaves %j read-only", (schema) => {
    expect(answerFormat(schema)).toBeNull();
  });
});

it("sends the chosen option's value", async () => {
  await render(
    interrupt({
      oneOf: [
        { const: "staging", title: "Staging" },
        { const: "production", title: "Production" },
      ],
    }),
  );
  const production = host.querySelectorAll<HTMLInputElement>(
    'input[type="radio"]',
  )[1]!;
  await act(async () => production.click());
  await click("Send");
  expect(answers).toEqual(["production"]);
});

it("answers yes or no with buttons and Y/N keys", async () => {
  await render(interrupt({ type: "boolean" }));
  await click("No");
  await click("Yes, continue");
  await act(async () => {
    host
      .querySelector("section")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "y", bubbles: true }));
  });
  expect(answers).toEqual([false, true, true]);
});

it("requires text before sending", async () => {
  await render(interrupt({ type: "string", maxLength: 50 }));
  await click("Send");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Write an answer",
  );
  await type(host.querySelector("textarea")!, "Faster startup");
  expect(host.textContent).toContain("14 / 50");
  await click("Send");
  expect(answers).toEqual(["Faster startup"]);
});

it("validates form fields and sends typed values", async () => {
  await render(
    interrupt({
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", title: "Email" },
        count: { type: "integer", title: "Count" },
        notify: { type: "boolean", title: "Notify" },
      },
    }),
  );
  await click("Send");
  expect(host.textContent).toContain("Email is required.");
  const [email, count] = host.querySelectorAll("input:not([type=checkbox])");
  await type(email!, "not-an-email");
  await click("Send");
  expect(host.textContent).toContain("Email must be an email address.");
  await type(email!, "dana@example.com");
  await type(count!, "2.5");
  await click("Send");
  expect(host.textContent).toContain("Count must be a number.");
  await type(count!, "3");
  await act(async () =>
    host.querySelector<HTMLInputElement>("input[type=checkbox]")!.click(),
  );
  await click("Send");
  expect(answers).toEqual([
    { email: "dana@example.com", count: 3, notify: true },
  ]);
});

it("falls back to a read-only view without a supported format or handler", async () => {
  await render(interrupt(undefined, { type: "file_upload" }));
  expect(host.textContent).toContain("Answer this where the run started");
  expect(
    host.querySelector('[aria-label="Interrupt payload"]')?.textContent,
  ).toContain("file_upload");
  expect(host.querySelector("button")).toBeNull();
  await render(interrupt({ type: "boolean" }), { answerable: false });
  expect(host.textContent).toContain("Answer this where the run started");
});

it("disables answers when unavailable and collapses once answered", async () => {
  await render(interrupt({ type: "boolean" }), { enabled: false });
  expect(
    [...host.querySelectorAll("button")].every((item) => item.disabled),
  ).toBe(true);
  await render({ ...interrupt({ type: "boolean" }), state: "resolved" });
  expect(host.textContent).toContain("Answered");
  expect(host.querySelector("button")).toBeNull();
});
