import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceInputProps } from "./voice-input.js";
import type { useVoiceRecorder } from "./use-voice-recorder.js";
export function useVoiceTranscript(
  props: VoiceInputProps,
  recorder: Pick<ReturnType<typeof useVoiceRecorder>, "stop" | "cancel">,
) {
  const [processing, setProcessing] = useState(false),
    [failed, setFailed] = useState(false);
  const latest = useRef({ props, recorder });
  latest.current = { props, recorder };
  const generation = useRef(0);
  const cancel = useCallback(() => {
    generation.current++;
    latest.current.recorder.cancel();
    latest.current.props.onCancelTranscription?.();
    setProcessing(false);
    setFailed(false);
  }, []);
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
      generation.current++;
      latest.current.props.onCancelTranscription?.();
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", escape);
    };
  }, [cancel]);
  useEffect(() => {
    if (props.disabled) cancel();
  }, [props.disabled, cancel]);
  const stop = useCallback(async () => {
    const request = ++generation.current;
    setProcessing(true);
    setFailed(false);
    try {
      const blob = await latest.current.recorder.stop();
      if (blob && request === generation.current) {
        const text = await latest.current.props.transcribe?.(blob, blob.type);
        if (request === generation.current) {
          if (text !== undefined) latest.current.props.onTranscript(text);
          else setFailed(true);
        }
      }
    } catch {
      if (request === generation.current) setFailed(true);
    } finally {
      if (request === generation.current) setProcessing(false);
    }
  }, []);
  return {
    busy: processing || props.transcribing,
    failed,
    cancel,
    stop,
    reset: () => setFailed(false),
  };
}
