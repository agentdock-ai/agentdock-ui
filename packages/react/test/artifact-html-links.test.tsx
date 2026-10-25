// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import type { Artifact } from "@agentdock-ai/ui-core";
import { ArtifactViewHtml } from "../../../apps/registry/registry/agentdock-ui/artifact-view-html.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("exposes validated external links outside the opaque script-disabled preview", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const artifact: Artifact = {
    id: "page.html",
    title: "Page",
    kind: "html",
    versions: [],
    content:
      '<a href="https://example.com?a=1&amp;b=2">Read &amp; learn</a><a href="https://example.com?a=1&amp;b=2">Read &amp; learn</a><a href="javascript:alert(1)">Unsafe</a><a href="/private">Local</a><a href="data:text/html,bad">Data</a><area href="https://example.org" alt="Map link"><a href="https://example.net"></a>',
  };
  try {
    await act(async () =>
      root.render(<ArtifactViewHtml artifact={artifact} />),
    );
    const links = [...host.querySelectorAll("nav a")];
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute("href")).toBe("https://example.com?a=1&b=2");
    expect(links[0].textContent).toBe("Read & learn");
    expect(
      links.every(
        (a) =>
          a.getAttribute("target") === "_blank" &&
          a.getAttribute("rel") === "noopener noreferrer",
      ),
    ).toBe(true);
    expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe("");
    await act(async () =>
      root.render(
        <ArtifactViewHtml
          artifact={{
            ...artifact,
            content: '<a href="https://new.example">New version</a>',
          }}
        />,
      ),
    );
    expect(host.querySelectorAll("nav a")).toHaveLength(1);
    expect(host.querySelector("nav a")?.textContent).toBe("New version");
    await act(async () =>
      root.render(
        <ArtifactViewHtml artifact={{ ...artifact, content: undefined }} />,
      ),
    );
    expect(host.querySelector("nav")).toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});
