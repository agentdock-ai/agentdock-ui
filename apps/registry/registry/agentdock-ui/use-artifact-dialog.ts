"use client";
import { useEffect, useRef } from "react";
/** Native modal dialogs supply focus trapping and inert the chat on small screens. */
export function useArtifactDialog(fullscreen: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    const query = window.matchMedia?.("(max-width: 767px)");
    function show() {
      if (!dialog) return;
      if (dialog.open) dialog.close?.();
      if (query?.matches || fullscreen) {
        dialog.showModal?.();
        dialog.setAttribute("aria-modal", "true");
      } else {
        dialog.show?.();
        dialog.removeAttribute("aria-modal");
      }
      // Non-browser renderers may not implement the native dialog methods.
      dialog.setAttribute("open", "");
    }
    show();
    query?.addEventListener("change", show);
    return () => {
      query?.removeEventListener("change", show);
      dialog.close?.();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [fullscreen]);
  return ref;
}
