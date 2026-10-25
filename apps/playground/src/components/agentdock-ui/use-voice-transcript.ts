"use client";
import { useCallback, useRef, useState } from "react";
import type { VoiceTranscriptSource } from "./use-voice-stop";
import { useVoiceStop } from "./use-voice-stop";
import { useVoiceCancellation } from "./use-voice-cancellation";
export function useVoiceTranscript(
  props: VoiceTranscriptSource["props"],
  recorder: VoiceTranscriptSource["recorder"],
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
  useVoiceCancellation(
    cancel,
    props.disabled,
    () => {
      generation.current++;
      if (processing || props.transcribing || recorder.status !== "idle")
        latest.current.props.onCancelTranscription?.();
    },
    Boolean(processing || props.transcribing || recorder.status !== "idle"),
  );
  const stop = useVoiceStop(latest, generation, setProcessing, setFailed);
  return {
    busy: processing || props.transcribing,
    failed,
    cancel,
    stop,
    reset: () => setFailed(false),
  };
}
