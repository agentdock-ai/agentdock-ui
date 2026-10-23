// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "../../../apps/registry/registry/agentdock-ui/error-state.js";
import { RunStatusBanner } from "../../../apps/registry/registry/agentdock-ui/run-status-banner.js";
import {
  ThinkingIndicator,
  formatElapsed,
} from "../../../apps/registry/registry/agentdock-ui/thinking-indicator.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
const render = (node: React.ReactNode) => act(async () => root.render(node));
const button = (text: string) =>
  [...host.querySelectorAll("button")].find(
    (item) => item.textContent === text,
  );

describe("ErrorState", () => {
  it("uses friendly wording and tone for known codes", async () => {
    await render(
      <ErrorState
        title="Raw"
        detail="Approval expired."
        code="approval_expired"
      />,
    );
    expect(host.textContent).toContain("Expired");
    expect(host.textContent).toContain("This approval can no longer be given");
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    await render(<ErrorState title="Raw" detail="Busy" code="thread_busy" />);
    expect(host.textContent).toContain("Another run is active");
    await render(
      <ErrorState
        title="The agent couldn’t finish"
        detail="Agent execution failed."
        code="graph_error"
        scope="run"
      />,
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Run failed",
    );
    expect(host.textContent).toContain("graph_error");
  });

  it("hides secrets and repeats nothing the title already says", async () => {
    await render(
      <ErrorState title="Failed" detail="Authorization: Bearer sk-12345678" />,
    );
    expect(host.textContent).not.toContain("sk-12345678");
    await render(<ErrorState title="Same" detail="Same" />);
    expect(host.textContent?.match(/Same/g)).toHaveLength(1);
  });

  it("shows Retry only when it can be retried and a handler exists", async () => {
    const retry = vi.fn();
    await render(<ErrorState title="Failed" detail="x" onRetry={retry} />);
    await act(async () => button("Retry")!.click());
    expect(retry).toHaveBeenCalledTimes(1);
    await render(
      <ErrorState
        title="Failed"
        detail="x"
        onRetry={retry}
        retryable={false}
      />,
    );
    expect(button("Retry")).toBeUndefined();
    await render(<ErrorState title="Failed" detail="x" />);
    expect(button("Retry")).toBeUndefined();
  });

  it("opens details and copies a sanitized report", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await render(
      <ErrorState
        title="Failed"
        detail="Model timeout"
        code="graph_error"
        scope="run"
      />,
    );
    await act(async () => button("Show details")!.click());
    expect(host.querySelector("dl")?.textContent).toContain("Model timeout");
    await act(async () => button("Copy")!.click());
    expect(writeText).toHaveBeenCalledWith(
      "code: graph_error\nscope: run\nmessage: Model timeout",
    );
    expect(button("Copied")).toBeDefined();
  });
});

describe("RunStatusBanner", () => {
  it.each([
    ["paused", "Run paused"],
    ["paused-elsewhere", "Continue this run in your app"],
    ["stopped", "The partial answer is kept"],
    ["cancelled", "The server ended this run"],
    ["reconnecting", "The connection dropped"],
    ["offline", "Can’t reconnect"],
  ] as const)("describes %s", async (state, title) => {
    await render(<RunStatusBanner state={state} />);
    expect(host.querySelector("h3")?.textContent).toBe(title);
  });

  it("clamps reconnect progress and renders footer actions", async () => {
    await render(
      <RunStatusBanner
        state="reconnecting"
        progress={1.7}
        actions={<button type="button">Retry now</button>}
      />,
    );
    expect(
      host.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"),
    ).toBe("100");
    expect(button("Retry now")).toBeDefined();
  });
});

describe("ThinkingIndicator", () => {
  it("formats elapsed time", () => {
    expect(formatElapsed(4_200)).toBe("4s");
    expect(formatElapsed(64_000)).toBe("1m 04s");
  });

  it("shows elapsed time, the running step, and Stop once a step runs long", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    const stop = vi.fn();
    await render(
      <ThinkingIndicator
        startedAt={Date.now() - 4_000}
        step={{ label: "Searching the web", tool: "web_search" }}
        onStop={stop}
      />,
    );
    expect(host.textContent).toContain("Searching the web");
    expect(host.textContent).toContain("web_search");
    expect(host.textContent).toContain("4s");
    expect(button("Stop")).toBeUndefined();
    await act(async () => {
      vi.advanceTimersByTime(27_000);
    });
    expect(host.textContent).toContain("Still working");
    expect(host.textContent).toContain("taking longer than usual");
    await act(async () => button("Stop")!.click());
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("renders no elapsed time before mount or without a start", async () => {
    await render(<ThinkingIndicator label="working" />);
    expect(host.textContent).toBe("Working");
  });
});
