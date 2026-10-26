// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ArtifactView } from "../../../apps/registry/registry/agentdock-ui/artifact-view.js";
import type { Artifact, ArtifactKind } from "@agentdock-ai/ui-core";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
export const artifact = (kind: ArtifactKind, content: string): Artifact => ({
  id: `file.${kind}`,
  title: `file.${kind}`,
  kind,
  content,
  versions: [{ version: 1, content, toolCallId: "t" }],
});
it("renders text viewers, invalid JSON, sorting, paging and size fallback", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const render = async (
    kind: ArtifactKind,
    content: string,
    mode?: "source" | "raw",
  ) =>
    act(async () =>
      root.render(
        <ArtifactView
          key={kind + String(mode)}
          artifact={artifact(kind, content)}
          mode={mode}
        />,
      ),
    );
  for (const kind of ["code", "text", "markdown"] as const) {
    await render(kind, "Hello");
    expect(host.textContent).toContain("Hello");
  }
  await render("markdown", "# Heading");
  expect(host.querySelector("h2")).not.toBeNull();
  await render("markdown", "# Heading", "source");
  expect(host.querySelector("code")).not.toBeNull();
  await render("json", '{"answer":42}');
  expect(host.textContent).toContain("answer: 42");
  await render("json", '{"answer":42}', "raw");
  expect(host.querySelector("code")?.textContent).toContain('"answer": 42');
  await render("json", "bad");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "valid JSON",
  );
  await render(
    "csv",
    "Value\n12\n2\n" +
      Array.from({ length: 200 }, (_, i) => String(i + 100)).join("\n"),
  );
  await act(async () =>
    host
      .querySelector("th button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  expect(host.querySelector("tbody td")?.textContent).toBe("2");
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Next")
      ?.click(),
  );
  expect(host.textContent).toContain("2 / 2");
  await render("text", "x".repeat(1024 * 1024 + 1));
  expect(host.textContent).toContain("Download file");
  await act(async () => root.unmount());
});

it("sandboxes HTML, renders safe media URLs, and revokes viewer blobs", async () => {
  const { vi } = await import("vitest");
  const create = vi.fn().mockReturnValue("blob:owned");
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  const host = document.createElement("div");
  const root = createRoot(host);
  const html = artifact(
    "html",
    '<script>window.bad=true</script><a href="https://example.com">Link</a>',
  );
  await act(async () => root.render(<ArtifactView artifact={html} />));
  // Links may open in a new tab; scripts and same-origin access stay off.
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe(
    "allow-popups allow-popups-to-escape-sandbox",
  );
  expect(host.querySelector("iframe")?.getAttribute("srcdoc")).toContain(
    '<base target="_blank">',
  );
  await act(async () =>
    root.render(<ArtifactView artifact={html} allowHtmlScripts />),
  );
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe(
    "allow-scripts allow-popups allow-popups-to-escape-sandbox",
  );
  await act(async () =>
    root.render(<ArtifactView artifact={html} mode="code" />),
  );
  expect(host.querySelector("code")).not.toBeNull();
  const image = {
    ...artifact("image", "<svg/>"),
    id: "icon.svg",
    mimeType: "image/svg+xml",
  };
  await act(async () => root.render(<ArtifactView artifact={image} />));
  expect(host.querySelector("img")?.getAttribute("src")).toBe("blob:owned");
  // Agent SVG is shown through <img>, never inlined (icons are ours).
  expect(host.querySelector("svg:not(.lucide)")).toBeNull();
  await act(async () =>
    root.render(
      <ArtifactView
        artifact={{
          ...artifact("pdf", "pdf"),
          url: "https://example.com/a.pdf",
        }}
      />,
    ),
  );
  expect(revoke).toHaveBeenCalledWith("blob:owned");
  expect(host.querySelector("iframe")?.getAttribute("src")).toBe("blob:owned");
  await act(async () =>
    root.render(
      <ArtifactView
        artifact={{
          ...artifact("image", ""),
          content: undefined,
          url: "data:text/html,unsafe",
        }}
      />,
    ),
  );
  expect(host.querySelector("img")).toBeNull();
  expect(host.textContent).toContain("Download file");
  await act(async () =>
    root.render(
      <ArtifactView
        artifact={{
          ...artifact("image", ""),
          content: undefined,
          url: "data:image/png;base64,AA==",
        }}
      />,
    ),
  );
  expect(host.querySelector("img")).not.toBeNull();
  await act(async () => root.unmount());
});
