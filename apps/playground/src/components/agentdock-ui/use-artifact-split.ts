import {
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
const key = "agentdock.artifact-width";
const clamp = (width: number) => Math.min(75, Math.max(25, width));
function initialWidth() {
  try {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : 45;
  } catch {
    return 45;
  }
}
export function useArtifactSplit() {
  const [width, setWidth] = useState(initialWidth);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, String(width));
    } catch {
      /* Storage is optional in restricted contexts. */
    }
  }, [width]);
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next =
      event.key === "ArrowLeft"
        ? width + 2
        : event.key === "ArrowRight"
          ? width - 2
          : event.key === "Home"
            ? 25
            : event.key === "End"
              ? 75
              : undefined;
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
  return {
    width,
    divider: {
      onKeyDown,
      onPointerMove,
      onPointerDown(event: PointerEvent<HTMLElement>) {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
      },
      onPointerUp() {
        setDragging(false);
      },
      onLostPointerCapture() {
        setDragging(false);
      },
    },
  };
}
