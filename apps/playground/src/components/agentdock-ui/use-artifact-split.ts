"use client";
import { useEffect, useState } from "react";
import { useArtifactDivider } from "./use-artifact-divider";
const key = "agentdock.artifact-width";
function initialWidth() {
  try {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0
      ? Math.min(75, Math.max(25, stored))
      : 45;
  } catch {
    return 45;
  }
}
export function useArtifactSplit() {
  const [width, setWidth] = useState(initialWidth);
  const divider = useArtifactDivider(width, setWidth);
  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {
      /* Storage is optional in restricted contexts. */
    }
  }, [width]);
  return { width, divider };
}
