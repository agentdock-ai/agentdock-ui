"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  VoiceRecorder,
  idleVoiceRecorder,
  meterAudioLevel,
  voiceSupported,
} from "./voice-recorder.js";

export interface VoiceTranscriptOptions {
  transcribe?: (audio: Blob, mimeType: string) => Promise<string | undefined>;
  onTranscript: (text: string) => void;
  onCancelTranscription?: () => void;
  transcribing?: boolean;
  disabled?: boolean;
}

/** Run `cancel` on Escape or when the tab is hidden, but only while `active`. */
function useCancelOn(active: boolean, cancel: () => void) {
  const state = useRef({ active, cancel });
  state.current = { active, cancel };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && state.current.active) state.current.cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state.current.active)
        state.current.cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", escape);
    };
  }, []);
}

export function useVoiceRecorder(maxDurationMs = 120_000) {
  const controller = useRef<VoiceRecorder | null>(null);
  const [state, setState] = useState(idleVoiceRecorder);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const current = new VoiceRecorder(setState, maxDurationMs);
    controller.current = current;
    setSupported(voiceSupported());
    return () => {
      current.dispose();
      controller.current = null;
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
  useCancelOn(state.status !== "idle", cancel);
  return { ...state, supported, start, stop, cancel };
}

export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || typeof AudioContext === "undefined") {
      setLevel(0);
      return;
    }
    return meterAudioLevel(stream, setLevel);
  }, [stream]);
  return level;
}

/** "m:ss" since `startedAt`. */
export function useVoiceTimer(startedAt?: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (startedAt === undefined) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [startedAt]);
  return `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
}

type Recorder = Pick<
  ReturnType<typeof useVoiceRecorder>,
  "stop" | "cancel" | "status"
>;

/** Stop → transcribe → insert; later requests win and cancels discard results. */
export function useVoiceTranscript(
  options: VoiceTranscriptOptions,
  recorder: Recorder,
) {
  const [processing, setProcessing] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ options, recorder });
  latest.current = { options, recorder };
  const generation = useRef(0);
  const busy = processing || Boolean(options.transcribing);
  const active = busy || recorder.status !== "idle";

  const cancel = useCallback(() => {
    generation.current++;
    latest.current.recorder.cancel();
    latest.current.options.onCancelTranscription?.();
    setProcessing(false);
    setFailed(false);
  }, []);

  const stop = useCallback(async () => {
    const request = ++generation.current;
    const { options, recorder } = latest.current;
    setProcessing(true);
    setFailed(false);
    try {
      const blob = await recorder.stop();
      if (!blob || request !== generation.current) return;
      const text = await options.transcribe?.(blob, blob.type);
      if (request !== generation.current) return;
      if (text?.trim()) latest.current.options.onTranscript(text);
      else setFailed(true);
    } catch {
      if (request === generation.current) setFailed(true);
    } finally {
      if (request === generation.current) setProcessing(false);
    }
  }, []);

  // The recorder owns Escape while recording; this owns it while transcribing.
  useCancelOn(busy, cancel);
  useEffect(() => {
    if (options.disabled && active) cancel();
  }, [options.disabled, active, cancel]);
  const busyRef = useRef(active);
  busyRef.current = active;
  useEffect(
    () => () => {
      generation.current++;
      if (busyRef.current) latest.current.options.onCancelTranscription?.();
    },
    [],
  );

  return { busy, failed, cancel, stop, reset: () => setFailed(false) };
}
