import { useCallback, useEffect, useRef, useState } from "react";
import { createVoiceRecorder } from "./voice-recorder";
import { idleVoiceRecorder, voiceSupported } from "./voice-recorder-utils";
export function useVoiceRecorder(maxDurationMs = 120_000) {
  const controller = useRef<ReturnType<typeof createVoiceRecorder> | null>(
    null,
  );
  const [state, setState] = useState(idleVoiceRecorder);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const current = createVoiceRecorder(setState, maxDurationMs);
    controller.current = current;
    setSupported(voiceSupported());
    const hidden = () => {
      if (document.hidden) current.cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") current.cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("keydown", escape);
    return () => {
      current.dispose();
      controller.current = null;
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", escape);
    };
  }, [maxDurationMs]);
  const start = useCallback(
    () => controller.current?.start() ?? Promise.resolve(false),
    [],
  );
  const stop = useCallback(
    () => controller.current?.stop() ?? Promise.resolve(undefined),
    [],
  );
  const cancel = useCallback(() => controller.current?.cancel(), []);
  return { ...state, supported, start, stop, cancel };
}
