// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { JsonValue } from "@agentdock-ai/contracts";
import type { RenderApproval } from "@agentdock-ai/ui-core";
import { ApprovalCard } from "../../../apps/registry/registry/agentdock-ui/approval-card.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
let responses: (readonly JsonValue[])[];
const approval = (): RenderApproval => ({
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
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  responses = [];
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(value = approval(), enabled = true, pending = false) {
  await act(async () =>
    root.render(
      <ApprovalCard
        approval={value}
        enabled={enabled}
        pending={pending}
        onRespond={(decisions) => responses.push(decisions)}
      />,
    ),
  );
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );
  if (!button) throw new Error(`Missing button ${text}`);
  await act(async () => button.click());
}
async function choose(name: string, value: string) {
  const select = host.querySelector<HTMLSelectElement>(
    `select[aria-label="${name} decision"]`,
  )!;
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function edit(value: string) {
  const textarea = host.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("submits approve and reject in original action order", async () => {
  await render();
  await choose("run_command", "reject");
  await click("Submit decisions");
  expect(responses).toEqual([[{ type: "approve" }, { type: "reject" }]]);
  expect(host.textContent).toContain("Writes a file");
});
it("exposes only allowed decisions and edits arguments without changing the tool", async () => {
  await render();
  const command = host.querySelector<HTMLSelectElement>(
    'select[aria-label="run_command decision"]',
  )!;
  expect([...command.options].map((option) => option.value)).toEqual([
    "approve",
    "reject",
  ]);
  expect(host.querySelector("textarea")).toBeNull();
  await choose("write_file", "edit");
  await edit('{"path":"edited"}');
  await click("Submit decisions");
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
it("rejects invalid edited JSON before sending a batch", async () => {
  await render();
  await choose("write_file", "edit");
  for (const value of ["broken", "[]"]) {
    await edit(value);
    await click("Submit decisions");
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  }
  expect(responses).toEqual([]);
});
it("batch shortcuts are available only when every action permits them", async () => {
  await render();
  await click("Approve all");
  await click("Reject all");
  expect(responses).toEqual([
    [{ type: "approve" }, { type: "approve" }],
    [{ type: "reject" }, { type: "reject" }],
  ]);
  const restricted = approval();
  restricted.actions = [
    { id: "a", label: "restricted", input: {}, allowedDecisions: ["reject"] },
  ];
  await render(restricted);
  expect(host.textContent).not.toContain("Approve all");
  await click("Submit decisions");
  expect(responses.at(-1)).toEqual([{ type: "reject" }]);
});
it("disables unavailable and pending approvals and keeps resolved/custom approvals read-only", async () => {
  await render(approval(), true, true);
  expect(
    [...host.querySelectorAll("button")].every((button) => button.disabled),
  ).toBe(true);
  await render(approval(), false);
  expect(
    [...host.querySelectorAll("button")].every((button) => button.disabled),
  ).toBe(true);
  const unavailable = approval();
  unavailable.actions = [
    { id: "a", label: "none", input: {}, allowedDecisions: [] },
  ];
  await render(unavailable);
  expect(host.querySelector<HTMLButtonElement>("button")!.disabled).toBe(true);
  await render({ ...approval(), state: "resolved" });
  expect(host.querySelector("button")).toBeNull();
  await render({ ...approval(), kind: "custom" });
  expect(host.querySelector("select")).toBeNull();
});
