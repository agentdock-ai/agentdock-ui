import { createContext, useContext, useState, type ReactNode } from "react";
import type { Artifact } from "@agentdock-ai/ui-core";
import type { ArtifactOptions } from "./artifact-types";
import { useArtifactTabs } from "./use-artifact-tabs";
import { safeUrl } from "./utils";
interface ArtifactContextValue extends ReturnType<typeof useArtifactTabs> {
  artifacts: readonly Artifact[];
  options: ArtifactOptions;
  openLink(url: string): boolean;
}
const Context = createContext<ArtifactContextValue | null>(null);
export function ArtifactProvider({
  artifacts,
  options = {},
  children,
}: {
  artifacts: readonly Artifact[];
  options?: ArtifactOptions;
  children: ReactNode;
}) {
  const [links, setLinks] = useState<Artifact[]>([]);
  const all = [
    ...artifacts,
    ...links.filter((link) => !artifacts.some((a) => a.id === link.id)),
  ];
  const tabs = useArtifactTabs(all);
  function openLink(url: string) {
    if (!safeUrl(url) || !/^https:/i.test(url)) return false;
    const id = `link:${url}`;
    setLinks((current) =>
      current.some((a) => a.id === id)
        ? current
        : [
            ...current,
            {
              id,
              title: new URL(url).host,
              kind: "link",
              url,
              versions: [{ version: 1, url, toolCallId: id }],
            },
          ],
    );
    tabs.open(id);
    return true;
  }
  return (
    <Context.Provider value={{ ...tabs, artifacts: all, options, openLink }}>
      {children}
    </Context.Provider>
  );
}
export function useArtifacts() {
  return useContext(Context);
}
