// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ArtifactViewLink } from "../../../apps/registry/registry/agentdock-ui/artifact-view-link.js";
import type { Artifact } from "@agentdock-ai/ui-core";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const artifact: Artifact = {
  id: "link",
  title: "Example",
  kind: "link",
  url: "https://example.com",
  versions: [],
};
it("only frames HTTPS and always offers an escape for framed sites", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  for (const url of [
    "http://example.com",
    "javascript:bad",
    "data:text/html,x",
  ]) {
    await act(async () =>
      root.render(<ArtifactViewLink artifact={{ ...artifact, url }} />),
    );
    expect(host.querySelector("iframe")).toBeNull();
    expect(host.textContent).toContain("HTTPS");
  }
  await act(async () => root.render(<ArtifactViewLink artifact={artifact} />));
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe(
    "allow-scripts allow-forms allow-popups allow-same-origin",
  );
  expect(host.querySelector("iframe")?.getAttribute("referrerpolicy")).toBe(
    "no-referrer",
  );
  expect(host.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(
    artifact.url,
  );
  expect(host.textContent).toContain("Some sites can’t be shown here");
  const before = host.querySelector("iframe");
  await act(async () => host.querySelector("button")?.click());
  expect(host.querySelector("iframe")).not.toBe(before);
  const canEmbed = vi.fn().mockResolvedValue(false);
  await act(async () =>
    root.render(<ArtifactViewLink artifact={artifact} canEmbed={canEmbed} />),
  );
  expect(canEmbed).toHaveBeenCalledWith(artifact.url);
  expect(host.querySelector("iframe")).toBeNull();
  expect(host.textContent).toContain("This site can’t be shown here");
  await act(async () =>
    root.render(
      <ArtifactViewLink
        artifact={{
          ...artifact,
          url: location.origin.replace("http:", "https:"),
        }}
      />,
    ),
  );
  await act(async () => root.unmount());
});
