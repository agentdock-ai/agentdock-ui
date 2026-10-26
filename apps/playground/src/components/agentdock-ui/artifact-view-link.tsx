"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Lock, RotateCw } from "lucide-react";
import type { ArtifactViewerProps } from "./artifact-types";
import { artifactLinkSandbox, artifactLinkUrl } from "./artifact-url";
import { Alert } from "./alert";
import { ChatIcon } from "./icon";

type Embed = "checking" | "allowed" | "blocked";

/** Ask the host whether the site allows framing; without a check, try it. */
function useEmbed(url: string, canEmbed?: (url: string) => Promise<boolean>) {
  const [state, setState] = useState<{ url: string; value: Embed }>();
  useEffect(() => {
    if (!canEmbed) return;
    let live = true;
    setState({ url, value: "checking" });
    Promise.resolve()
      .then(() => canEmbed(url))
      .then(
        (allowed) =>
          live && setState({ url, value: allowed ? "allowed" : "blocked" }),
        () => live && setState({ url, value: "allowed" }),
      );
    return () => {
      live = false;
    };
  }, [url, canEmbed]);
  if (!canEmbed) return "allowed";
  return state?.url === url ? state.value : "checking";
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
  const address = new URL(url);
  return (
    <div className="flex h-full min-h-96 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5">
        <button
          type="button"
          aria-label="Reload"
          title="Reload"
          onClick={() => setReload(reload + 1)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChatIcon icon={RotateCw} size={13} />
        </button>
        <div
          aria-label="Page URL"
          className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-muted/60 px-2.5 text-xs"
        >
          <ChatIcon icon={Lock} size={11} className="text-muted-foreground" />
          <span className="truncate">
            <span className="text-foreground">{address.host}</span>
            <span className="text-muted-foreground">
              {address.pathname === "/" ? "" : address.pathname}
              {address.search}
            </span>
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in new tab"
          title="Open in new tab"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ChatIcon icon={ExternalLink} size={13} />
        </a>
      </div>
      <LinkFrame {...props} url={url} reload={reload} />
      <p className="border-t border-border px-3 py-1.5 text-[11.5px] leading-4 text-muted-foreground">
        Page not loading? Some sites can’t be shown here, so open it in a new
        tab.
      </p>
    </div>
  );
}

function LinkFrame({
  url,
  reload,
  artifact,
  canEmbed,
}: ArtifactViewerProps & { url: string; reload: number }) {
  const embed = useEmbed(url, canEmbed);
  if (embed === "checking")
    return (
      <p role="status" className="flex-1 p-4 text-sm text-muted-foreground">
        Checking whether this page can be shown…
      </p>
    );
  if (embed === "blocked")
    return (
      <div className="flex-1 p-4">
        <Alert tone="info" status="Link" title="This site can’t be shown here">
          It doesn’t allow being embedded. Use Open in new tab to visit it.
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
      className="block min-h-80 w-full flex-1 border-0 bg-white"
    />
  );
}
