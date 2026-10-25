"use client";
import { useState } from "react";
import type { ArtifactViewerProps } from "./artifact-types";
import { artifactLinkUrl, artifactLinkSandbox } from "./artifact-url";
import { useLinkEmbed } from "./use-link-embed";
import { Alert } from "./alert";
import { Button } from "./ui/button";
function LinkHeader({ url, reload }: { url: string; reload: () => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <input
          aria-label="Page URL"
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
        />
        <Button onClick={reload}>Reload</Button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded px-2 text-xs underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Open in new tab
        </a>
      </div>
      <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
        Page not loading? Some sites can’t be shown here —{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Open in new tab.
        </a>
      </p>
    </>
  );
}
function LinkBody({
  url,
  artifact,
  canEmbed,
  reload,
}: { url: string; reload: number } & ArtifactViewerProps) {
  const embed = useLinkEmbed(url, canEmbed);
  if (embed === "checking")
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        Checking preview availability…
      </p>
    );
  if (embed === "blocked")
    return (
      <div className="p-4">
        <Alert tone="info" status="Link" title="This site can’t be shown here">
          Use Open in new tab to visit the page.
        </Alert>
      </div>
    );
  return (
    <iframe
      key={`${url}:${reload}`}
      title={artifact.title}
      src={url}
      sandbox={artifactLinkSandbox(url)}
      referrerPolicy="no-referrer"
      className="min-h-80 w-full flex-1 border-0 bg-white"
    />
  );
}
export function ArtifactViewLink(props: ArtifactViewerProps) {
  const url = artifactLinkUrl(props.artifact.url);
  const [reload, setReload] = useState(0);
  if (!url)
    return (
      <div className="p-4">
        <Alert tone="warning" status="Link" title="This URL can’t be previewed">
          Only valid HTTPS links can open here.
        </Alert>
      </div>
    );
  return (
    <div className="flex h-full min-h-96 flex-col">
      <LinkHeader url={url} reload={() => setReload(reload + 1)} />
      <LinkBody {...props} url={url} reload={reload} />
    </div>
  );
}
