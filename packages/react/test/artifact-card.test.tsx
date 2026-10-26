// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Artifact } from "@agentdock-ai/ui-core";
import { ArtifactProvider } from "../../../apps/registry/registry/agentdock-ui/artifact-context.js";
import { ArtifactCards } from "../../../apps/registry/registry/agentdock-ui/artifact-card.js";
import { ArtifactPanel } from "../../../apps/registry/registry/agentdock-ui/artifact-panel.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
const page: Artifact = {
  id: "site/index.html",
  title: "index.html",
  kind: "html",
  content: "<p>v2</p>",
  versions: [
    { version: 1, content: "<p>v1</p>", toolCallId: "write-1" },
    { version: 2, content: "<p>v2</p>", toolCallId: "write-2" },
  ],
};
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
const render = (children: ReactNode) =>
  act(async () =>
    root.render(
      <ArtifactProvider artifacts={[page]}>{children}</ArtifactProvider>,
    ),
  );
const button = (label: string) =>
  host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

it("shows a card per produced file with its type and version, and opens it", async () => {
  await render(
    <>
      <ArtifactCards toolCallId="write-1" />
      <ArtifactCards toolCallId="write-2" />
      <ArtifactCards toolCallId="unrelated" />
      <ArtifactPanel render={(a) => <p>{a.content}</p>} />
    </>,
  );
  const cards = host.querySelectorAll('[aria-label="Open index.html"]');
  expect(cards).toHaveLength(2);
  expect(cards[0]?.textContent).toContain("HTML · v1 of 2");
  expect(cards[1]?.textContent).toContain("HTML · v2");
  expect(cards[1]?.textContent).toContain("Open");
  await act(async () => (cards[1] as HTMLButtonElement).click());
  expect(cards[1]?.getAttribute("aria-current")).toBe("true");
  expect(cards[1]?.textContent).toContain("Viewing");
  expect(host.querySelector("h2")?.textContent).toBe("index.html");
  expect(
    host
      .querySelector<HTMLSelectElement>('[aria-label="Artifact version"]')
      ?.selectedOptions[0]?.getAttribute("aria-label"),
  ).toBe("Version 2 of 2 (latest)");
});

it("uses one header row, copies with feedback, and Esc leaves full screen first", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  await render(
    <>
      <ArtifactCards toolCallId="write-2" />
      <ArtifactPanel render={(a) => <p>{a.content}</p>} />
    </>,
  );
  await act(async () => button("Open index.html")?.click());
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(0);
  expect(host.querySelector('[aria-pressed="true"]')?.textContent).toBe(
    "Preview",
  );
  await act(async () => button("Copy")?.click());
  expect(writeText).toHaveBeenCalledWith("<p>v2</p>");
  expect(host.textContent).toContain("Copied");

  await act(async () => button("Full screen")?.click());
  expect(button("Exit full screen")).not.toBeNull();
  const escape = () =>
    act(async () =>
      host
        .querySelector("dialog")
        ?.dispatchEvent(new Event("cancel", { cancelable: true })),
    );
  await escape();
  expect(button("Full screen")).not.toBeNull();
  expect(host.querySelector("h2")?.textContent).toBe("index.html");
  await escape();
  expect(
    host.querySelector('[aria-label="Open index.html"]')?.textContent,
  ).toContain("Open");
});

it("shows an empty state with a close button when nothing is selected", async () => {
  await render(<ArtifactPanel />);
  expect(host.textContent).toContain("Nothing open");
  expect(button("Close artifact panel")).not.toBeNull();
});
