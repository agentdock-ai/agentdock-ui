import {
  idleVoiceRecorder,
  stopVoiceTracks,
  voiceSupported,
  voiceRecorderError,
  type VoiceRecorderState,
} from "./voice-recorder-utils.js";
import { voiceRecorderSession } from "./voice-recorder-session.js";
class VoiceRecorder {
  private session?: ReturnType<typeof voiceRecorderSession>;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private disposed = false;
  constructor(
    private changed: (state: VoiceRecorderState) => void,
    private maxDurationMs: number,
  ) {}
  private update(state: VoiceRecorderState) {
    if (!this.disposed) this.changed(state);
  }
  private clear() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
  cancel(error?: string) {
    this.generation++;
    this.clear();
    this.session?.cancel();
    this.session = undefined;
    this.update({ ...idleVoiceRecorder, error });
  }
  async start() {
    if (this.disposed || this.session || !voiceSupported()) return false;
    const request = ++this.generation;
    this.update({ status: "requesting", stream: null });
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.disposed || request !== this.generation) {
        stopVoiceTracks(stream);
        return false;
      }
      this.session = voiceRecorderSession(
        stream,
        () => this.cancel("Recording failed. Please try again."),
        () => {
          if (request !== this.generation) return;
          this.clear();
          this.session = undefined;
          this.update(idleVoiceRecorder);
        },
      );
      this.timer = setTimeout(
        () =>
          this.cancel(
            `Recording reached the ${Math.round(this.maxDurationMs / 1000)}-second limit. Try a shorter recording.`,
          ),
        this.maxDurationMs,
      );
      this.update({ status: "recording", stream, startedAt: Date.now() });
      return true;
    } catch (error) {
      stopVoiceTracks(stream);
      if (request === this.generation) this.cancel(voiceRecorderError(error));
      return false;
    }
  }
  async stop() {
    const current = this.session;
    if (!current) return;
    this.clear();
    this.update(idleVoiceRecorder);
    const result = await current.stop();
    if (this.session === current) this.session = undefined;
    return result;
  }
  dispose() {
    this.disposed = true;
    this.cancel();
  }
}
export function createVoiceRecorder(
  changed: (state: VoiceRecorderState) => void,
  maxDurationMs: number,
) {
  return new VoiceRecorder(changed, maxDurationMs);
}
