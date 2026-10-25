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
