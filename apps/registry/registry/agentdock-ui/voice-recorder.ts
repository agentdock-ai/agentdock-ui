import {
  idleVoiceRecorder,
  stopVoiceTracks,
  voiceSupported,
  voiceRecorderError,
  type VoiceRecorderState,
} from "./voice-recorder-utils.js";
import { voiceRecorderSession } from "./voice-recorder-session.js";
export function createVoiceRecorder(
  changed: (state: VoiceRecorderState) => void,
  maxDurationMs: number,
) {
  let session: ReturnType<typeof voiceRecorderSession> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0,
    disposed = false;
  const update = (state: VoiceRecorderState) => {
    if (!disposed) changed(state);
  };
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  function cancel(error?: string) {
    generation++;
    clear();
    session?.cancel();
    session = undefined;
    update({ ...idleVoiceRecorder, error });
  }
  return {
    async start() {
      if (disposed || session || !voiceSupported()) return false;
      const request = ++generation;
      update({ status: "requesting", stream: null });
      let stream: MediaStream | undefined;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (disposed || request !== generation) {
          stopVoiceTracks(stream);
          return false;
        }
        session = voiceRecorderSession(
          stream,
          () => cancel("Recording failed. Please try again."),
          () => {
            if (request !== generation) return;
            clear();
            session = undefined;
            update(idleVoiceRecorder);
          },
        );
        timer = setTimeout(
          () =>
            cancel(
              `Recording reached the ${Math.round(maxDurationMs / 1000)}-second limit. Try a shorter recording.`,
            ),
          maxDurationMs,
        );
        update({ status: "recording", stream, startedAt: Date.now() });
        return true;
      } catch (error) {
        stopVoiceTracks(stream);
        if (request === generation) cancel(voiceRecorderError(error));
        return false;
      }
    },
    async stop() {
      const current = session;
      if (!current) return;
      clear();
      update(idleVoiceRecorder);
      const result = await current.stop();
      if (session === current) session = undefined;
      return result;
    },
    cancel,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
