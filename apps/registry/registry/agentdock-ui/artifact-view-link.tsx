import { useState } from "react";
import type { ArtifactViewerProps } from "./artifact-types.js";
import { artifactLinkUrl, artifactLinkSandbox } from "./artifact-url.js";
import { useLinkEmbed } from "./use-link-embed.js";
import { Alert } from "./alert.js";
import { Button } from "../ui/button.js";
export function ArtifactViewLink({ artifact, canEmbed }: ArtifactViewerProps) {
  const url = artifactLinkUrl(artifact.url);
  const [reload, setReload] = useState(0);
  const embed = useLinkEmbed(url, canEmbed);
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
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <input
          aria-label="Page URL"
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
        />
        <Button onClick={() => setReload(reload + 1)}>Reload</Button>
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
      {embed === "checking" ? (
        <p role="status" className="p-4 text-sm text-muted-foreground">
          Checking preview availability…
        </p>
      ) : embed === "blocked" ? (
        <div className="p-4">
          <Alert
            tone="info"
            status="Link"
            title="This site can’t be shown here"
          >
            Use Open in new tab to visit the page.
          </Alert>
        </div>
      ) : (
        <iframe
          key={`${url}:${reload}`}
          title={artifact.title}
          src={url}
          sandbox={artifactLinkSandbox(url)}
          referrerPolicy="no-referrer"
          className="min-h-80 w-full flex-1 border-0 bg-white"
        />
      )}
    </div>
  );
}
