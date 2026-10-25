// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Chat } from "../src/components/agentdock-ui/chat";
import { createArtifactPreviewStore } from "../src/gallery/artifact-fixtures";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("keeps artifacts opt in and opens file versions from collapsed tool groups", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const props = {
    store: createArtifactPreviewStore(),
    adapter: { async *sendMessage() {} },
  };
  await act(async () => root.render(createElement(Chat, props)));
  expect(host.querySelector('[aria-label="Open index.html"]')).toBeNull();
  await act(async () =>
    root.render(
      createElement(Chat, { ...props, artifacts: { links: "panel" } }),
    ),
  );
  const open = host.querySelector<HTMLButtonElement>(
    '[aria-label="Open index.html"]',
  );
  expect(open).not.toBeNull();
  expect(host.querySelector("dialog")).toBeNull();
  await act(async () => open?.click());
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe("");
  expect(
    host.querySelector('select[aria-label="Artifact version"]')?.textContent,
  ).toContain("v2");
  const link = host.querySelector<HTMLAnchorElement>(
    'a[href="https://example.com"]',
  );
  await act(async () =>
    link?.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      }),
    ),
  );
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(1);
  await act(async () =>
    link?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    ),
  );
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
