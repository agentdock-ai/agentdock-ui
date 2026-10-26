// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { artifactDownload } from "../../../apps/registry/registry/agentdock-ui/artifact-download.js";
import { artifactExternalUrl } from "../../../apps/registry/registry/agentdock-ui/artifact-url.js";
import type { Artifact } from "@agentdock-ai/ui-core";
it("downloads content with a revoked blob URL and refuses unsafe link actions", () => {
  vi.useFakeTimers();
  const create = vi.fn().mockReturnValue("blob:owned"),
    revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  const artifact: Artifact = {
    id: "folder/file.txt",
    title: "folder/file.txt",
    kind: "text",
    content: "text",
    versions: [],
  };
  artifactDownload(artifact);
  expect(click).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalled();
  expect(document.querySelector("a[download]")).toBeNull();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith("blob:owned");
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "mailto:test@example.com",
  ]) {
    const link: Artifact = {
      ...artifact,
      kind: "link",
      content: undefined,
      url,
    };
    expect(artifactExternalUrl(link)).toBeUndefined();
    artifactDownload(link);
  }
  expect(click).toHaveBeenCalledTimes(1);
  artifactDownload({
    ...artifact,
    kind: "link",
    content: undefined,
    url: "https://example.com",
  });
  expect(click).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
  vi.useRealTimers();
});
