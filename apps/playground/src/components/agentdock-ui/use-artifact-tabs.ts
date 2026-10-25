"use client";
import { useEffect, useState } from "react";
import type { Artifact } from "@agentdock-ai/ui-core";
export function useArtifactTabs(artifacts: readonly Artifact[]) {
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeId, setActive] = useState<string>();
  const [visible, setVisible] = useState(false);
  const [chosen, setChosen] = useState<Record<string, number | undefined>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});
  const active = artifacts.find((a) => a.id === activeId);
  const latest = active?.versions.length ?? 0;
  useEffect(() => {
    if (activeId && visible)
      setSeen((current) => ({ ...current, [activeId]: latest }));
  }, [activeId, latest, visible]);
  return {
    tabs: tabs.filter((id) => artifacts.some((a) => a.id === id)),
    activeId,
    visible,
    chosen,
    seen,
    open(id: string) {
      setTabs((current) => (current.includes(id) ? current : [...current, id]));
      setActive(id);
      setVisible(true);
    },
    close(id: string) {
      const remaining = tabs.filter((tab) => tab !== id);
      setTabs(remaining);
      if (activeId === id) setActive(remaining.at(-1));
      if (!remaining.length) setVisible(false);
    },
    selectVersion(id: string, version?: number) {
      setChosen((current) => ({ ...current, [id]: version }));
    },
    dismiss() {
      setVisible(false);
    },
  };
}
