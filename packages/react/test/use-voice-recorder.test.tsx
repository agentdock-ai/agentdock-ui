// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useVoiceRecorder } from "../../../apps/registry/registry/agentdock-ui/use-voice-input.js";
import { FakeRecorder, mockVoice } from "./voice-test-support.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root,
  host: HTMLDivElement,
  recorder: ReturnType<typeof useVoiceRecorder>;
function Probe({ max = 120000 }: { max?: number }) {
  recorder = useVoiceRecorder(max);
  return (
    <p>
      {recorder.status}:{recorder.error}
    </p>
  );
}
beforeEach(() => {
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("returns a Blob on stop, releases tracks and falls back to MP4 or browser defaults", async () => {
  const mock = mockVoice();
  await act(async () => root.render(<Probe />));
  expect(recorder.supported).toBe(true);
  for (const types of [["audio/webm;codecs=opus"], ["audio/mp4"], []]) {
    FakeRecorder.types = types;
    await act(async () => {
      await recorder.start();
    });
    expect(recorder.status).toBe("recording");
    await act(async () => {
      const blob = await recorder.stop();
      expect(blob?.size).toBeGreaterThan(0);
      expect(blob?.type).toBe(types[0] || "audio/webm");
    });
    expect(recorder.stream).toBeNull();
    expect(recorder.status).toBe("idle");
  }
  expect(mock.stopped).toHaveBeenCalledTimes(3);
  expect(await recorder.stop()).toBeUndefined();
});
it("discards cancelled audio and cancels at the duration limit or on tab hide", async () => {
  const mock = mockVoice();
  vi.useFakeTimers();
  await act(async () => root.render(<Probe max={1000} />));
  await act(async () => {
    await recorder.start();
  });
  await act(async () => recorder.cancel());
  expect(mock.stopped).toHaveBeenCalledTimes(1);
  await act(async () => {
    await recorder.start();
  });
  await act(async () => vi.advanceTimersByTime(1000));
  expect(host.textContent).toContain("1-second limit");
  expect(mock.stopped).toHaveBeenCalledTimes(2);
  await act(async () => {
    await recorder.start();
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(recorder.status).toBe("idle");
  expect(mock.stopped).toHaveBeenCalledTimes(3);
  delete (document as { hidden?: boolean }).hidden;
});
it("releases on unmount and ignores a late permission response", async () => {
  const mock = mockVoice();
  await act(async () => root.render(<Probe />));
  await act(async () => {
    await recorder.start();
  });
  await act(async () => root.unmount());
  expect(mock.stopped).toHaveBeenCalledTimes(1);
  root = createRoot(host);
  let finish: ((stream: unknown) => void) | undefined;
  mock.getUserMedia.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => root.render(<Probe />));
  let pending: Promise<boolean> | undefined;
  await act(async () => {
    pending = recorder.start();
  });
  await act(async () => recorder.cancel());
  await act(async () => {
    finish?.(mock.stream);
    await pending;
  });
  expect(mock.stopped).toHaveBeenCalledTimes(2);
  expect(FakeRecorder.instances).toHaveLength(1);
});
it("reports denied permissions and recorder errors and handles Escape", async () => {
  const mock = mockVoice();
  mock.getUserMedia.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await act(async () => root.render(<Probe />));
  await act(async () => {
    await recorder.start();
  });
  expect(host.textContent).toContain("Microphone access is blocked");
  FakeRecorder.fail = true;
  await act(async () => {
    await recorder.start();
  });
  expect(mock.stopped).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Recording failed");
  FakeRecorder.fail = false;
  await act(async () => {
    await recorder.start();
  });
  await act(async () => FakeRecorder.instances.at(-1)?.onerror?.());
  expect(recorder.status).toBe("idle");
  await act(async () => {
    await recorder.start();
  });
  await act(async () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(recorder.status).toBe("idle");
});
it("ignores Escape and tab hides while idle, so an error message stays visible", async () => {
  const mock = mockVoice();
  mock.getUserMedia.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await act(async () => root.render(<Probe />));
  await act(async () => {
    await recorder.start();
  });
  expect(host.textContent).toContain("Microphone access is blocked");
  await act(async () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  delete (document as { hidden?: boolean }).hidden;
  expect(host.textContent).toContain("Microphone access is blocked");
});

it("returns to idle when the browser stops the recorder on its own", async () => {
  mockVoice();
  await act(async () => root.render(<Probe />));
  await act(async () => {
    await recorder.start();
  });
  expect(recorder.status).toBe("recording");
  await act(async () => FakeRecorder.instances.at(-1)?.onstop?.());
  expect(recorder.status).toBe("idle");
});
