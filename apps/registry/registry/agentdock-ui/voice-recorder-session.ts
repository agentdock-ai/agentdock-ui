import { stopVoiceTracks, voiceMimeType } from "./voice-recorder-utils.js";
/** Own one recorder and discard late events after cancellation. */
export function voiceRecorderSession(
  stream: MediaStream,
  failed: () => void,
  ended: () => void,
) {
  const mimeType = voiceMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  let chunks: Blob[] = [],
    cancelled = false;
  let stopped: Promise<Blob | undefined> | undefined;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      stopVoiceTracks(stream);
    }
  };
  let resolve: ((value: Blob | undefined) => void) | undefined;
  recorder.ondataavailable = (event) => {
    if (!cancelled && event.data.size) chunks.push(event.data);
  };
  recorder.onstop = () => {
    release();
    if (!cancelled) ended();
    const blob = cancelled
      ? undefined
      : new Blob(chunks, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
    chunks = [];
    resolve?.(blob);
  };
  recorder.onerror = failed;
  recorder.start();
  return {
    stop() {
      if (stopped) return stopped;
      stopped = new Promise<Blob | undefined>((done) => {
        resolve = done;
        release();
        try {
          recorder.stop();
        } catch {
          chunks = [];
          done(undefined);
          failed();
        }
      });
      return stopped;
    },
    cancel() {
      cancelled = true;
      chunks = [];
      release();
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* Tracks are already released. */
        }
      }
      resolve?.(undefined);
    },
  };
}
