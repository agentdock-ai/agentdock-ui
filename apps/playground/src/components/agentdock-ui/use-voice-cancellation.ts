"use client";
import { useEffect, useRef } from "react";
export function useVoiceCancellation(
  cancel: () => void,
  disabled: boolean | undefined,
  dispose: () => void,
  active: boolean,
) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const cleanup = useRef(dispose);
  cleanup.current = dispose;
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && activeRef.current) cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeRef.current) cancel();
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
    if (disabled && active) cancel();
  }, [disabled, cancel, active]);
}
