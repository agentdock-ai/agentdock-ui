"use client";
import { useCallback } from "react";
import type { VoiceInputProps } from "./voice-input";
import type { useVoiceRecorder } from "./use-voice-recorder";
export interface VoiceTranscriptSource {
  props: VoiceInputProps;
  recorder: Pick<
    ReturnType<typeof useVoiceRecorder>,
    "stop" | "cancel" | "status"
  >;
}
export function useVoiceStop(
  latest: { current: VoiceTranscriptSource },
  generation: { current: number },
  setProcessing: (value: boolean) => void,
  setFailed: (value: boolean) => void,
) {
  return useCallback(async () => {
    const request = ++generation.current;
    setProcessing(true);
    setFailed(false);
    try {
      const blob = await latest.current.recorder.stop();
      if (blob && request === generation.current) {
        const text = await latest.current.props.transcribe?.(blob, blob.type);
        if (request === generation.current) {
          if (text !== undefined && text.trim())
            latest.current.props.onTranscript(text);
          else setFailed(true);
        }
      }
    } catch {
      if (request === generation.current) setFailed(true);
    } finally {
      if (request === generation.current) setProcessing(false);
    }
  }, [latest, generation, setProcessing, setFailed]);
}
