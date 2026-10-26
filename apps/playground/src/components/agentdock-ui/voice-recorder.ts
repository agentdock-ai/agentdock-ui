/** Browser recording and level metering, with no React. */

export interface VoiceRecorderState {
  status: "idle" | "requesting" | "recording";
  stream: MediaStream | null;
  startedAt?: number;
  error?: string;
}
export const idleVoiceRecorder: VoiceRecorderState = {
  status: "idle",
  stream: null,
};

export const voiceSupported = () =>
  typeof MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const voiceMimeType = () =>
  ["audio/webm;codecs=opus", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
const stopTracks = (stream?: MediaStream) =>
  stream?.getTracks().forEach((track) => track.stop());
const failedMessage = "Recording failed. Please try again.";
const errorMessage = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "name" in error &&
  (error.name === "NotAllowedError" || error.name === "SecurityError")
    ? "Microphone access is blocked. Allow it in the browser’s site settings."
    : failedMessage;

/**
 * One recorder at a time. A generation counter discards late permission
 * answers and recorder events that arrive after a cancel.
 */
export class VoiceRecorder {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private finished?: (blob: Blob | undefined) => void;
  private limit?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private disposed = false;
  private status: VoiceRecorderState["status"] = "idle";

  constructor(
    private readonly changed: (state: VoiceRecorderState) => void,
    private readonly maxDurationMs: number,
  ) {}

  /** True while asking for the mic or recording. */
  get active() {
    return this.status !== "idle";
  }

  async start() {
    if (this.disposed || this.active || !voiceSupported()) return false;
    const request = ++this.generation;
    this.update({ status: "requesting", stream: null });
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.disposed || request !== this.generation) {
        stopTracks(stream);
        return false;
      }
      this.record(stream, request);
      return true;
    } catch (error) {
      // Once recording began the stream is ours and cancel() releases it.
      if (stream !== this.stream) stopTracks(stream);
      if (request === this.generation) this.cancel(errorMessage(error));
      return false;
    }
  }

  /** Stop and resolve with the recording, or undefined if there was none. */
  stop(): Promise<Blob | undefined> {
    const recorder = this.recorder;
    if (!recorder) return Promise.resolve(undefined);
    const done = new Promise<Blob | undefined>((resolve) => {
      this.finished = resolve;
    });
    this.release();
    this.update(idleVoiceRecorder);
    try {
      recorder.stop();
    } catch {
      this.finish(undefined);
      this.update({ ...idleVoiceRecorder, error: failedMessage });
    }
    return done;
  }

  cancel(error?: string) {
    this.generation++;
    this.chunks = [];
    const recorder = this.recorder;
    this.release();
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* Tracks are already released. */
      }
    }
    this.finish(undefined);
    this.update({ ...idleVoiceRecorder, error });
  }

  dispose() {
    this.disposed = true;
    this.cancel();
  }

  private record(stream: MediaStream, request: number) {
    const mimeType = voiceMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    this.stream = stream;
    this.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (request === this.generation && event.data.size)
        this.chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (request !== this.generation) return;
      // Stopped by the browser (for example the mic was unplugged), not by us.
      if (this.recorder === recorder) {
        this.release();
        this.update(idleVoiceRecorder);
      }
      const blob = new Blob(this.chunks, {
        type: recorder.mimeType || mimeType || "audio/webm",
      });
      this.chunks = [];
      this.finish(blob);
    };
    recorder.onerror = () => this.cancel(failedMessage);
    recorder.start();
    this.limit = setTimeout(
      () =>
        this.cancel(
          `Recording reached the ${Math.round(this.maxDurationMs / 1000)}-second limit. Try a shorter recording.`,
        ),
      this.maxDurationMs,
    );
    this.update({ status: "recording", stream, startedAt: Date.now() });
  }

  /** Free the microphone and timer; the recorder object may still flush. */
  private release() {
    clearTimeout(this.limit);
    this.limit = undefined;
    stopTracks(this.stream);
    this.stream = undefined;
    this.recorder = undefined;
  }

  private finish(blob: Blob | undefined) {
    this.finished?.(blob);
    this.finished = undefined;
  }

  private update(state: VoiceRecorderState) {
    this.status = state.status;
    if (!this.disposed) this.changed(state);
  }
}

/** Sample microphone loudness (0–1) each frame; metering is optional. */
export function meterAudioLevel(
  stream: MediaStream,
  update: (level: number) => void,
) {
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let meter: AnalyserNode | undefined;
  let frame: number | undefined;
  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    source?.disconnect();
    meter?.disconnect();
    void context?.close().catch(() => {});
  };
  try {
    context = new AudioContext();
    const analyser = context.createAnalyser();
    meter = analyser;
    analyser.fftSize = 256;
    source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    void context.resume().catch(() => {});
    const buffer = new Uint8Array(analyser.fftSize);
    const sample = () => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const n of buffer) sum += ((n - 128) / 128) ** 2;
      update(Math.min(1, Math.sqrt(sum / buffer.length) * 2));
      frame = requestAnimationFrame(sample);
    };
    sample();
  } catch {
    stop();
    update(0);
  }
  return stop;
}
