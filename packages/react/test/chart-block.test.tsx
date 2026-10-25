// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ChartBlock } from "../../../apps/registry/registry/agentdock-ui/chart-block.js";
import type { TaggedBlock } from "@agentdock-ai/ui-core";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("renders each chart, legends, an accessible summary, table and focus tooltip", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  for (const type of ["bar", "line", "area", "pie"]) {
    const block: TaggedBlock = {
      kind: "block",
      tag: "chart",
      state: "complete",
      raw: "raw",
      attributes: { type, title: "Revenue" },
      body: JSON.stringify(
        type === "pie"
          ? { slices: [{ label: "Sales", value: 12 }] }
          : { x: ["Jan"], series: [{ name: "Sales", data: [12] }] },
      ),
    };
    await act(async () => root.render(<ChartBlock key={type} block={block} />));
    expect(
      host.querySelector('[role="img"]')?.getAttribute("aria-label"),
    ).toContain("Revenue: Sales");
    expect(host.querySelector('[aria-label="Legend"]')?.textContent).toBe(
      "Sales",
    );
    await act(async () =>
      host
        .querySelector<SVGGElement>("g[tabindex]")
        ?.dispatchEvent(new FocusEvent("focusin", { bubbles: true })),
    );
    expect(host.querySelector('[role="tooltip"]')?.textContent).toContain("12");
    await act(async () =>
      host.querySelector<HTMLButtonElement>("button")?.click(),
    );
    expect(host.querySelector("table")?.textContent).toContain("12");
  }
  for (const state of ["streaming", "unterminated", "complete"] as const) {
    await act(async () =>
      root.render(
        <ChartBlock
          block={{
            kind: "block",
            tag: "chart",
            state,
            attributes: {},
            body: "bad",
            raw: "retained source",
          }}
        />,
      ),
    );
    expect(host.textContent).toContain(
      state === "streaming" ? "Chart" : "Couldn’t draw this chart",
    );
    if (state !== "streaming")
      expect(host.querySelector("pre")?.textContent).toBe("retained source");
  }
  await act(async () => root.unmount());
  host.remove();
});
