"use client";
import { useEffect, useRef } from "react";
export function useVoiceCancellation(
  cancel: () => void,
  disabled: boolean | undefined,
  dispose: () => void,
) {
  const cleanup = useRef(dispose);
  cleanup.current = dispose;
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("keydown", escape);
    return () => {
      cleanup.current();
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", escape);
    };
  }, [cancel]);
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled, cancel]);
}
