// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import {
  ArtifactProvider,
  useArtifacts,
} from "../../../apps/registry/registry/agentdock-ui/artifact-context.js";
import { ArtifactPanel } from "../../../apps/registry/registry/agentdock-ui/artifact-panel.js";
import type { Artifact } from "@agentdock-ai/ui-core";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const file = (id: string, count = 1): Artifact => ({
  id,
  title: id,
  kind: "text",
  content: `v${count}`,
  versions: Array.from({ length: count }, (_, i) => ({
    version: i + 1,
    content: `v${i + 1}`,
    toolCallId: `${id}${i}`,
  })),
});
function Harness() {
  const context = useArtifacts();
  return (
    <>
      <button onClick={() => context?.open("a")}>Open a</button>
      <button onClick={() => context?.open("b")}>Open b</button>
      <button onClick={() => context?.openLink("https://example.com")}>
        Link
      </button>
      <button onClick={() => context?.openLink("javascript:bad")}>
        Bad link
      </button>
      <ArtifactPanel render={(a) => <pre>{a.content}</pre>} />
    </>
  );
}
it("opens, navigates, closes and versions tabs, and marks unseen updates", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  const render = (children: ReactNode) =>
    act(async () => root.render(children));
  const tree = (count = 1) => (
    <ArtifactProvider artifacts={[file("a", count), file("b")]}>
      <Harness />
    </ArtifactProvider>
  );
  const click = async (text: string) =>
    act(async () =>
      [...host.querySelectorAll("button")]
        .find((b) => b.textContent === text)
        ?.click(),
    );
  await render(tree());
  expect(host.textContent).toContain("Open a file or link");
  await click("Open a");
  await click("Open b");
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
  await render(tree(2));
  expect(host.querySelector('[aria-label="Updated"]')).not.toBeNull();
  await act(async () =>
    host
      .querySelector('[role="tab"][aria-selected="true"]')
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      ),
  );
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe("v2");
  const select = host.querySelector<HTMLSelectElement>(
    'select[aria-label="Artifact version"]',
  );
  await act(async () => {
    if (select) {
      select.value = "1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe("v1");
  await render(tree(3));
  expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe("v1");
  await click("Link");
  await click("Link");
  await click("Bad link");
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(3);
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Close example.com"]')
      ?.click(),
  );
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
  await act(async () => root.unmount());
  host.remove();
});
