import { stopVoiceTracks, voiceMimeType } from "./voice-recorder-utils.js";
class VoiceRecorderSession {
  private recorder: MediaRecorder;
  private mimeType?: string;
  private chunks: Blob[] = [];
  private cancelled = false;
  private released = false;
  private stopped?: Promise<Blob | undefined>;
  private resolve?: (value: Blob | undefined) => void;
  constructor(
    private stream: MediaStream,
    private failed: () => void,
    private ended: () => void,
  ) {
    this.mimeType = voiceMimeType();
    this.recorder = new MediaRecorder(
      stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined,
    );
    this.recorder.ondataavailable = (event) => {
      if (!this.cancelled && event.data.size) this.chunks.push(event.data);
    };
    this.recorder.onstop = () => this.finish();
    this.recorder.onerror = failed;
    this.recorder.start();
  }
  private release() {
    if (!this.released) {
      this.released = true;
      stopVoiceTracks(this.stream);
    }
  }
  private finish() {
    this.release();
    if (!this.cancelled) this.ended();
    const blob = this.cancelled
      ? undefined
      : new Blob(this.chunks, {
          type: this.recorder.mimeType || this.mimeType || "audio/webm",
        });
    this.chunks = [];
    this.resolve?.(blob);
  }
  stop() {
    if (this.stopped) return this.stopped;
    this.stopped = new Promise<Blob | undefined>((done) => {
      this.resolve = done;
      this.release();
      try {
        this.recorder.stop();
      } catch {
        this.chunks = [];
        done(undefined);
        this.failed();
      }
    });
    return this.stopped;
  }
  cancel() {
    this.cancelled = true;
    this.chunks = [];
    this.release();
    if (this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* Tracks are already released. */
      }
    }
    this.resolve?.(undefined);
  }
}
/** Own one recorder and discard late events after cancellation. */
export function voiceRecorderSession(
  stream: MediaStream,
  failed: () => void,
  ended: () => void,
) {
  return new VoiceRecorderSession(stream, failed, ended);
}
