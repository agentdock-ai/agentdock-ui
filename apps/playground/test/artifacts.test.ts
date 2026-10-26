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
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe(
    "allow-popups allow-popups-to-escape-sandbox",
  );
  expect(
    host
      .querySelector<HTMLSelectElement>('select[aria-label="Artifact version"]')
      ?.selectedOptions[0]?.getAttribute("aria-label"),
  ).toBe("Version 1 of 2");
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
  // Modifier clicks keep browser behaviour, so still one file open and no tab strip.
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(0);
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

it("renders two fixture charts and preserves the fenced chart example", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createPreviewStore } = await import("../src/gallery/fixtures");
  const html = renderToStaticMarkup(
    createElement(Chat, {
      store: createPreviewStore("chart"),
      adapter: { async *sendMessage() {} },
    }),
  );
  expect(html.match(/role="img"/g)).toHaveLength(2);
  expect(html).toContain("Monthly sales");
  expect(html).toContain("&lt;chart");
});

it("keeps the active stream and composer mounted while opening and closing a preview", async () => {
  const { AgentStore } = await import("@agentdock-ai/react");
  const { sequence, complete } =
    await import("../../../scripts/fixtures/events");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  let signal: AbortSignal | undefined;
  let finish: (() => void) | undefined;
  const call = {
    toolCallId: "stream-file",
    name: "create_file",
    input: { path: "index.html", content: "<h1>Stream stays active</h1>" },
  };
  const adapter = {
    async *sendMessage(input: { signal: AbortSignal }) {
      signal = input.signal;
      yield* sequence(
        [
          { type: "run.started" },
          { type: "tool.called", toolCall: call },
          { type: "tool.completed", result: { ...call, output: "Created" } },
        ],
        "live-preview",
      );
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      yield* sequence(
        [complete("Still streaming after preview opens.")],
        "live-preview",
        "phase-1",
        3,
      );
    },
  };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      createElement(Chat, {
        store: new AgentStore(),
        adapter,
        artifacts: {},
        suggestions: ["Start streaming file"],
      }),
    ),
  );
  await act(async () => {
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Start streaming file")
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const composer = host.querySelector("textarea");
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Open index.html"]')
      ?.click(),
  );
  expect(signal?.aborted).toBe(false);
  expect(host.querySelector("textarea")).toBe(composer);
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Close artifact panel"]')
      ?.click(),
  );
  expect(host.querySelector("textarea")).toBe(composer);
  expect(signal?.aborted).toBe(false);
  await act(async () => finish?.());
  expect(host.textContent).toContain("Still streaming after preview opens.");
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
