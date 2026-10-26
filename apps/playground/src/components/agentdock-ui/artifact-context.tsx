"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Artifact } from "@agentdock-ai/ui-core";
import type { ArtifactOptions } from "./artifact-types";
import { safeUrl } from "./utils";

interface ArtifactContextValue {
  artifacts: readonly Artifact[];
  options: ArtifactOptions;
  /** Open tabs, in order; only ids that still exist. */
  tabs: string[];
  activeId?: string;
  visible: boolean;
  /** Version picked per artifact; absent means the latest. */
  chosen: Record<string, number | undefined>;
  /** Latest version the user has seen per artifact, for the "Updated" dot. */
  seen: Record<string, number>;
  open(id: string): void;
  close(id: string): void;
  dismiss(): void;
  selectVersion(id: string, version?: number): void;
  openLink(url: string): boolean;
}
const Context = createContext<ArtifactContextValue | null>(null);

function linkArtifact(url: string): Artifact {
  const id = `link:${url}`;
  return {
    id,
    title: new URL(url).host,
    kind: "link",
    url,
    versions: [{ version: 1, url, toolCallId: id }],
  };
}

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
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [visible, setVisible] = useState(false);
  const [chosen, setChosen] = useState<Record<string, number | undefined>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});
  const all = [
    ...artifacts,
    ...links.filter((link) => !artifacts.some((a) => a.id === link.id)),
  ];
  const latest = all.find((a) => a.id === activeId)?.versions.length ?? 0;
  useEffect(() => {
    if (activeId && visible)
      setSeen((current) => ({ ...current, [activeId]: latest }));
  }, [activeId, latest, visible]);

  function show(id: string) {
    setTabs((current) => (current.includes(id) ? current : [...current, id]));
    setActiveId(id);
    setVisible(true);
  }
  const value: ArtifactContextValue = {
    artifacts: all,
    options,
    tabs: tabs.filter((id) => all.some((a) => a.id === id)),
    activeId,
    visible,
    chosen,
    seen,
    open: show,
    close(id) {
      const remaining = tabs.filter((tab) => tab !== id);
      setTabs(remaining);
      if (activeId === id) setActiveId(remaining.at(-1));
      if (!remaining.length) setVisible(false);
    },
    dismiss: () => setVisible(false),
    selectVersion(id, version) {
      setChosen((current) => ({ ...current, [id]: version }));
    },
    openLink(url) {
      if (!safeUrl(url) || !/^https:/i.test(url)) return false;
      const link = linkArtifact(url);
      setLinks((current) =>
        current.some((a) => a.id === link.id) ? current : [...current, link],
      );
      show(link.id);
      return true;
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useArtifacts() {
  return useContext(Context);
}
