"use client";
import { useEffect, useState } from "react";
export function useLinkEmbed(
  url: string | undefined,
  canEmbed?: (url: string) => Promise<boolean>,
) {
  const [state, setState] = useState<{
    url?: string;
    value: "checking" | "allowed" | "blocked";
  }>({ value: "checking" });
  useEffect(() => {
    let live = true;
    if (!url || !canEmbed) return;
    setState({ url, value: "checking" });
    Promise.resolve()
      .then(() => canEmbed(url))
      .then(
        (allowed) => {
          if (live) setState({ url, value: allowed ? "allowed" : "blocked" });
        },
        () => {
          if (live) setState({ url, value: "allowed" });
        },
      );
    return () => {
      live = false;
    };
  }, [url, canEmbed]);
  return !canEmbed ? "allowed" : state.url === url ? state.value : "checking";
}
