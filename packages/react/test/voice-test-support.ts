import { vi } from "vitest";
export class FakeRecorder {
  static types = ["audio/webm;codecs=opus"];
  static instances: FakeRecorder[] = [];
  static fail = false;
  static isTypeSupported(type: string) {
    return this.types.includes(type);
  }
  state = "inactive";
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: unknown, options?: { mimeType: string }) {
    this.mimeType = options?.mimeType || "audio/webm";
    FakeRecorder.instances.push(this);
  }
  start() {
    if (FakeRecorder.fail) throw Error("start");
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["audio"]) });
      this.onstop?.();
    });
  }
}
export function mockVoice() {
  FakeRecorder.types = ["audio/webm;codecs=opus"];
  FakeRecorder.instances = [];
  FakeRecorder.fail = false;
  const stopped = vi.fn();
  const stream = { getTracks: () => [{ stop: stopped }] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { stopped, stream, getUserMedia };
}
