// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { JsonValue } from "@agentdock-ai/contracts";
import type { RenderApproval } from "@agentdock-ai/ui-core";
import {
  ApprovalCard,
  type ToolRisk,
} from "../../../apps/registry/registry/agentdock-ui/approval-card.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
let responses: (readonly JsonValue[])[];
const batch = (): RenderApproval => ({
  interruptId: "i",
  kind: "tool-approval",
  title: "Review",
  detail: "Choose per tool",
  state: "pending",
  decisions: [],
  actions: [
    {
      id: "a",
      label: "write_file",
      input: { path: "original" },
      allowedDecisions: ["approve", "edit", "reject"],
      description: "Writes a file",
    },
    {
      id: "b",
      label: "run_command",
      input: { command: "test" },
      allowedDecisions: ["approve", "reject"],
    },
  ],
});
const single = (
  allowedDecisions: ("approve" | "edit" | "reject")[] = [
    "approve",
    "edit",
    "reject",
  ],
): RenderApproval => ({
  ...batch(),
  actions: [
    {
      id: "c",
      label: "run_command",
      description: "Run a shell command",
      input: { command: "npm test" },
      allowedDecisions,
    },
  ],
});
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  responses = [];
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
async function render(
  value = batch(),
  options: {
    enabled?: boolean;
    pending?: boolean;
    error?: string;
    errorCode?: string;
    expiresAt?: number;
    riskOf?: (name: string) => ToolRisk | undefined;
  } = {},
) {
  await act(async () =>
    root.render(
      <ApprovalCard
        approval={value}
        enabled={options.enabled ?? true}
        pending={options.pending ?? false}
        error={options.error}
        errorCode={options.errorCode}
        expiresAt={options.expiresAt}
        riskOf={options.riskOf}
        onRespond={(decisions) => responses.push(decisions)}
      />,
    ),
  );
}
const button = (text: string) =>
  [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.startsWith(text),
  );
async function click(text: string) {
  const target = button(text);
  if (!target) throw new Error(`Missing button ${text}`);
  await act(async () => target.click());
}
async function choose(tool: string, decision: string) {
  const input = host.querySelector<HTMLInputElement>(
    `[aria-label="${tool} decision"] input[aria-label="${decision}"]`,
  );
  if (!input) throw new Error(`Missing ${decision} for ${tool}`);
  await act(async () => input.click());
}
async function type(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function key(target: Element, init: KeyboardEventInit) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, ...init }),
    );
  });
}

it("submits per-action decisions in the original order", async () => {
  await render();
  await choose("run_command", "Reject");
  await click("Submit");
  expect(responses).toEqual([[{ type: "approve" }, { type: "reject" }]]);
  expect(host.textContent).toContain("Writes a file");
  expect(host.textContent).toContain("1 approved · 1 rejected");
});

it("offers only allowed decisions and edits arguments without changing the tool", async () => {
  await render();
  const options = [
    ...host.querySelectorAll<HTMLInputElement>(
      '[aria-label="run_command decision"] input',
    ),
  ].map((input) => input.value);
  expect(options).toEqual(["approve", "reject"]);
  expect(host.querySelector("textarea")).toBeNull();
  await choose("write_file", "Edit");
  await type(host.querySelector("textarea")!, '{"path":"edited"}');
  await click("Submit");
  expect(responses).toEqual([
    [
      {
        type: "edit",
        editedAction: { name: "write_file", args: { path: "edited" } },
      },
      { type: "approve" },
    ],
  ]);
});

it("sends an optional rejection reason to the agent", async () => {
  await render();
  await choose("run_command", "Reject");
  await type(
    host.querySelector<HTMLInputElement>('input[type="text"]')!,
    "  Not now  ",
  );
  await click("Submit");
  expect(responses).toEqual([
    [{ type: "approve" }, { type: "reject", message: "Not now" }],
  ]);
});

it("rejects invalid edited JSON before sending a batch", async () => {
  await render();
  await choose("write_file", "Edit");
  for (const value of ["broken", "[]"]) {
    await type(host.querySelector("textarea")!, value);
    await click("Submit");
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  }
  expect(responses).toEqual([]);
});

it("shows batch shortcuts only when every action permits them", async () => {
  await render();
  await click("Approve all");
  await click("Reject all");
  expect(responses).toEqual([
    [{ type: "approve" }, { type: "approve" }],
    [{ type: "reject" }, { type: "reject" }],
  ]);
  const restricted = batch();
  restricted.actions = [
    { id: "a", label: "first", input: {}, allowedDecisions: ["reject"] },
    { id: "b", label: "second", input: {}, allowedDecisions: ["reject"] },
  ];
  await render(restricted);
  expect(button("Approve all")).toBeUndefined();
  await click("Submit");
  expect(responses.at(-1)).toEqual([{ type: "reject" }, { type: "reject" }]);
});

it("handles a single action with buttons and keyboard shortcuts", async () => {
  await render(single());
  const card = host.querySelector("section")!;
  expect(host.textContent).toContain("Run a shell command");
  await key(card, { key: "Enter" });
  await key(card, { key: "Escape" });
  expect(responses).toEqual([[{ type: "approve" }], [{ type: "reject" }]]);
  await click("Edit");
  await type(host.querySelector("textarea")!, '{"command":"npm run lint"}');
  await key(host.querySelector("textarea")!, { key: "Enter", metaKey: true });
  expect(responses.at(-1)).toEqual([
    {
      type: "edit",
      editedAction: { name: "run_command", args: { command: "npm run lint" } },
    },
  ]);
});

it("explains when editing isn't allowed and shows the tool's risk", async () => {
  await render(single(["approve", "reject"]), {
    riskOf: (name) => (name === "run_command" ? "high" : undefined),
  });
  expect(button("Edit")).toBeUndefined();
  expect(host.textContent).toContain("Editing isn’t allowed");
  expect(host.textContent).toContain("High risk");
});

it("counts down and leaves only Reject once an approval expires", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
  await render(single(), { expiresAt: Date.now() + 125_000 });
  expect(host.textContent).toContain("2:05 left");
  await act(async () => {
    vi.advanceTimersByTime(126_000);
  });
  expect(host.textContent).toContain("Expired");
  expect(button("Approve")).toBeUndefined();
  expect(button("Edit")).toBeUndefined();
  await click("Reject");
  expect(responses).toEqual([[{ type: "reject" }]]);
});

it("offers Reject and continue when the server reports an expired approval", async () => {
  await render(single(), {
    error: "Approval expired.",
    errorCode: "approval_expired",
  });
  expect(host.textContent).toContain("This approval can no longer be given");
  await click("Reject and continue");
  expect(responses).toEqual([[{ type: "reject" }]]);
});

it("disables controls when pending or unavailable and collapses once resolved", async () => {
  await render(batch(), { pending: true });
  expect(
    [...host.querySelectorAll("button")].every((item) => item.disabled),
  ).toBe(true);
  await render(batch(), { enabled: false });
  expect(
    [...host.querySelectorAll("button")].every((item) => item.disabled),
  ).toBe(true);
  const unavailable = batch();
  unavailable.actions = [
    { id: "a", label: "none", input: {}, allowedDecisions: [] },
    { id: "b", label: "other", input: {} },
  ];
  await render(unavailable);
  expect(button("Submit")!.disabled).toBe(true);
  await render({
    ...batch(),
    state: "resolved",
    decisions: [{ type: "edit" }, { type: "reject", message: "Later" }],
  });
  expect(host.querySelector("button")).toBeNull();
  expect(host.textContent).toContain("Edited, then approved");
  expect(host.textContent).toContain("Rejected");
  expect(host.textContent).toContain("“Later”");
});
