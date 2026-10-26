// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useAudioLevel } from "../../../apps/registry/registry/agentdock-ui/use-voice-input.js";
import { VoiceLevel } from "../../../apps/registry/registry/agentdock-ui/voice-input.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("measures RMS, tears down Web Audio and stays usable when the context fails", async () => {
  const disconnect = vi.fn(),
    close = vi.fn().mockResolvedValue(undefined),
    resume = vi.fn().mockResolvedValue(undefined);
  class Context {
    resume = resume;
    close = close;
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect };
    }
    createAnalyser() {
      return {
        fftSize: 256,
        getByteTimeDomainData(buffer: Uint8Array) {
          buffer.fill(160);
        },
        disconnect,
      };
    }
  }
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(7));
  const cancel = vi.fn();
  vi.stubGlobal("cancelAnimationFrame", cancel);
  const host = document.createElement("div");
  const root = createRoot(host);
  const stream = {} as MediaStream;
  function Probe({ value }: { value: MediaStream | null }) {
    return <VoiceLevel level={useAudioLevel(value)} />;
  }
  await act(async () => root.render(<Probe value={stream} />));
  expect(
    host.querySelector('[role="meter"]')?.getAttribute("aria-valuenow"),
  ).toBe("0.5");
  await act(async () => root.render(<Probe value={null} />));
  expect(close).toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalledTimes(2);
  expect(cancel).toHaveBeenCalledWith(7);
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        throw Error("Unavailable");
      }
    },
  );
  await act(async () => root.render(<Probe value={stream} />));
  expect(
    host.querySelector('[role="meter"]')?.getAttribute("aria-valuenow"),
  ).toBe("0");
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
