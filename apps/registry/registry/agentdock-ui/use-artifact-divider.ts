"use client";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
const clamp = (width: number) => Math.min(75, Math.max(25, width));
function keyedWidth(key: string, width: number) {
  return key === "ArrowLeft"
    ? width + 2
    : key === "ArrowRight"
      ? width - 2
      : key === "Home"
        ? 25
        : key === "End"
          ? 75
          : undefined;
}
export function useArtifactDivider(
  width: number,
  setWidth: (value: number) => void,
) {
  const [dragging, setDragging] = useState(false);
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = keyedWidth(event.key, width);
    if (next !== undefined) {
      event.preventDefault();
      setWidth(clamp(next));
    }
  }
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragging) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (rect?.width)
      setWidth(clamp(((rect.right - event.clientX) / rect.width) * 100));
  }
  function onPointerDown(event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }
  return {
    onKeyDown,
    onPointerMove,
    onPointerDown,
    onPointerUp: () => setDragging(false),
    onLostPointerCapture: () => setDragging(false),
  };
}
