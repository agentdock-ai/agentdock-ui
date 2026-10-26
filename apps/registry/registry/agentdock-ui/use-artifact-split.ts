"use client";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

const key = "agentdock.artifact-width";
const defaultWidth = 45;
const clamp = (width: number, minimum = 25, maximum = 75) =>
  Math.min(maximum, Math.max(minimum, width));

function limits(containerWidth: number) {
  const minimum =
    containerWidth > 0
      ? Math.min(50, Math.max(25, (360 / containerWidth) * 100))
      : 25;
  return { minimum, maximum: 100 - minimum };
}
function storedWidth() {
  try {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : defaultWidth;
  } catch {
    return defaultWidth;
  }
}

/** Remember the preferred split without squeezing either pane below its reading width. */
export function useArtifactSplit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [preferredWidth, setWidth] = useState(storedWidth);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const { minimum, maximum } = limits(containerWidth);
  const width = clamp(preferredWidth, minimum, maximum);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () =>
      setContainerWidth(element.getBoundingClientRect().width);
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(key, String(preferredWidth));
    } catch {
      /* Storage is optional in restricted contexts. */
    }
  }, [preferredWidth, dragging]);
  const divider = {
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      let next: number;
      switch (event.key) {
        case "ArrowLeft":
          next = width + 2;
          break;
        case "ArrowRight":
          next = width - 2;
          break;
        case "Home":
          next = minimum;
          break;
        case "End":
          next = maximum;
          break;
        default:
          return;
      }
      event.preventDefault();
      setWidth(clamp(next, minimum, maximum));
    },
    onDoubleClick() {
      setWidth(defaultWidth);
    },
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!dragging) return;
      const rect = event.currentTarget.parentElement?.getBoundingClientRect();
      if (rect?.width) {
        const bounds = limits(rect.width);
        setWidth(
          clamp(
            ((rect.right - event.clientX) / rect.width) * 100,
            bounds.minimum,
            bounds.maximum,
          ),
        );
      }
    },
    onPointerUp: () => setDragging(false),
    onPointerCancel: () => setDragging(false),
    onLostPointerCapture: () => setDragging(false),
  };
  return { containerRef, width, minimum, maximum, dragging, divider };
}
