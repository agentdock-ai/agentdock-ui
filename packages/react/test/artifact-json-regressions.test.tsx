// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Artifact } from "@agentdock-ai/ui-core";
import { ArtifactViewJson } from "../../../apps/registry/registry/agentdock-ui/artifact-view-json.js";
import { ArtifactHeader } from "../../../apps/registry/registry/agentdock-ui/artifact-header.js";
import type { ArtifactMode } from "../../../apps/registry/registry/agentdock-ui/artifact-types.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const json = (content: string): Artifact => ({
  id: "data.json",
  title: "data.json",
  kind: "json",
  content,
  versions: [],
});
it("renders Raw for deep valid JSON without recursive formatting failure", () => {
  const content = "[".repeat(20000) + "0" + "]".repeat(20000);
  expect(() =>
    renderToStaticMarkup(
      <ArtifactViewJson artifact={json(content)} mode="raw" />,
    ),
  ).not.toThrow();
});
it("round trips Show raw through the actual header and resets standalone mode changes", async () => {
  const artifact = json(
    JSON.stringify(Array.from({ length: 5001 }, (_, i) => i)),
  );
  function Viewer() {
    const [mode, setMode] = useState<ArtifactMode>("tree");
    return (
      <>
        <ArtifactHeader
          artifact={artifact}
          mode={mode}
          setMode={setMode}
          fullscreen={false}
          onFullscreen={() => {}}
        />
        <ArtifactViewJson
          artifact={artifact}
          mode={mode}
          onModeChange={setMode}
        />
      </>
    );
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  const click = (text: string) =>
    act(async () =>
      [...host.querySelectorAll("button")]
        .find((b) => b.textContent === text)
        ?.click(),
    );
  try {
    await act(async () => root.render(<Viewer />));
    await click("Show raw");
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe(
      "Raw",
    );
    await click("Tree");
    expect(host.querySelector('[aria-label="JSON tree"]')).not.toBeNull();
    await act(async () =>
      root.render(<ArtifactViewJson artifact={artifact} mode="tree" />),
    );
    await click("Show raw");
    await act(async () =>
      root.render(<ArtifactViewJson artifact={artifact} mode="raw" />),
    );
    await act(async () =>
      root.render(<ArtifactViewJson artifact={artifact} mode="tree" />),
    );
    expect(host.querySelector('[aria-label="JSON tree"]')).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});
