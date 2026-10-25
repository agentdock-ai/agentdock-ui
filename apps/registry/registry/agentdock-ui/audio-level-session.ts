/** Metering is optional; recording must still work when Web Audio is unavailable. */
export function audioLevelSession(
  stream: MediaStream,
  update: (level: number) => void,
) {
  let context: AudioContext | undefined,
    source: MediaStreamAudioSourceNode | undefined,
    analyser: AnalyserNode | undefined,
    frame: number | undefined;
  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    source?.disconnect();
    analyser?.disconnect();
    void context?.close().catch(() => {});
  };
  try {
    context = new AudioContext();
    source = context.createMediaStreamSource(stream);
    const meter = context.createAnalyser();
    analyser = meter;
    meter.fftSize = 256;
    source.connect(meter);
    const buffer = new Uint8Array(meter.fftSize);
    void context.resume().catch(() => {});
    const sample = () => {
      meter.getByteTimeDomainData(buffer);
      const rms = Math.sqrt(
        buffer.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) /
          buffer.length,
      );
      update(Math.min(1, rms * 2));
      frame = requestAnimationFrame(sample);
    };
    sample();
  } catch {
    stop();
    update(0);
  }
  return stop;
}
