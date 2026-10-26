// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useArtifactSplit } from "../../../apps/registry/registry/agentdock-ui/use-artifact-split.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function Split() {
  const { width, divider } = useArtifactSplit();
  return (
    <div role="separator" tabIndex={0} aria-valuenow={width} {...divider} />
  );
}
it("resizes with the keyboard and tolerates unavailable storage", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  await act(async () => root.render(<Split />));
  const divider = host.querySelector("div");
  expect(divider?.getAttribute("aria-valuenow")).toBe("45");
  for (const [key, width] of [
    ["ArrowLeft", "47"],
    ["ArrowRight", "45"],
    ["Home", "25"],
    ["End", "75"],
    ["x", "75"],
  ]) {
    await act(async () =>
      divider?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      ),
    );
    expect(divider?.getAttribute("aria-valuenow")).toBe(width);
  }
  await act(async () => root.unmount());
  vi.restoreAllMocks();
});

function SplitFrame() {
  const { containerRef, width, minimum, maximum, dragging, divider } =
    useArtifactSplit();
  return (
    <div ref={containerRef}>
      <div
        role="separator"
        tabIndex={0}
        aria-valuenow={width}
        aria-valuemin={minimum}
        aria-valuemax={maximum}
        data-dragging={dragging}
        {...divider}
      />
    </div>
  );
}

it("protects reading width on resize and restores the preferred split when space returns", async () => {
  localStorage.clear();
  let containerWidth = 1000;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      x: 0,
      y: 0,
      left: 0,
      right: containerWidth,
      top: 0,
      bottom: 600,
      width: containerWidth,
      height: 600,
      toJSON() {},
    }),
  );
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<SplitFrame />));
    const divider = host.querySelector('[role="separator"]')!;
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(45);
    expect(Number(divider.getAttribute("aria-valuemin"))).toBe(36);
    await act(async () =>
      divider.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      ),
    );
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(64);
    containerWidth = 800;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(55);
    containerWidth = 600;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(50);
    containerWidth = 1000;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(64);
    await act(async () =>
      divider.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })),
    );
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(45);
    expect(localStorage.getItem("agentdock.artifact-width")).toBe("45");
  } finally {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
    localStorage.clear();
  }
});

it("drags smoothly within reading bounds, saves on release, and handles cancelled gestures", async () => {
  localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      x: 0,
      y: 0,
      left: 0,
      right: 1000,
      top: 0,
      bottom: 600,
      width: 1000,
      height: 600,
      toJSON() {},
    }),
  );
  const writes = vi.spyOn(Storage.prototype, "setItem");
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<SplitFrame />));
    const divider = host.querySelector<HTMLElement>('[role="separator"]')!;
    const capture = vi.fn();
    divider.setPointerCapture = capture;
    const pointer = async (type: string, clientX: number, button = 0) =>
      act(async () => {
        const event = new MouseEvent(type, { bubbles: true, clientX, button });
        Object.defineProperty(event, "pointerId", { value: 1 });
        divider.dispatchEvent(event);
      });
    const saved = writes.mock.calls.length;
    await pointer("pointermove", 100);
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(45);
    await pointer("pointerdown", 550, 2);
    expect(divider.getAttribute("data-dragging")).toBe("false");
    await pointer("pointerdown", 550);
    expect(capture).toHaveBeenCalledWith(1);
    await pointer("pointermove", 100);
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(64);
    await pointer("pointermove", 900);
    expect(Number(divider.getAttribute("aria-valuenow"))).toBe(36);
    expect(writes.mock.calls.length).toBe(saved);
    await pointer("pointerup", 900);
    expect(localStorage.getItem("agentdock.artifact-width")).toBe("36");
    await pointer("pointerdown", 640);
    await pointer("pointercancel", 640);
    expect(divider.getAttribute("data-dragging")).toBe("false");
    await pointer("pointerdown", 640);
    await pointer("lostpointercapture", 640);
    expect(divider.getAttribute("data-dragging")).toBe("false");
  } finally {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
    localStorage.clear();
  }
});
