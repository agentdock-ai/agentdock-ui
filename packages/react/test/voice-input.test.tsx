// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Composer } from "../../../apps/registry/registry/agentdock-ui/composer.js";
import { VoiceInput } from "../../../apps/registry/registry/agentdock-ui/voice-input.js";
import { mockVoice } from "./voice-test-support.js";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("records, transcribes into the cursor selection and never auto-sends", async () => {
  const mock = mockVoice();
  const sent = vi.fn();
  let finish: ((text: string) => void) | undefined;
  const transcribe = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  function Draft() {
    const [value, setValue] = useState("Hello world");
    return (
      <Composer
        value={value}
        onChange={setValue}
        onSubmit={sent}
        busy={false}
        waiting={false}
        cancelling={false}
        voice={{ transcribe }}
      />
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Draft />));
  const input = host.querySelector("textarea");
  input?.focus();
  input?.setSelectionRange(5, 5);
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Start voice input"]')
      ?.click(),
  );
  expect(host.textContent).toContain("Recording");
  expect(host.querySelector('[role="meter"]')).not.toBeNull();
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Stop recording")
      ?.click(),
  );
  expect(host.textContent).toContain("Transcribing…");
  expect(mock.stopped).toHaveBeenCalledTimes(1);
  await act(async () => finish?.("new"));
  expect(input?.value).toBe("Hello new world");
  expect(sent).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(input);
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("hides unsupported or absent capabilities and explains denied permissions", async () => {
  const mock = mockVoice();
  const host = document.createElement("div");
  const root = createRoot(host);
  const transcript = vi.fn();
  const transcribe = vi.fn().mockResolvedValue("Draft");
  await act(async () => root.render(<VoiceInput onTranscript={transcript} />));
  expect(host.textContent).toBe("");
  mock.getUserMedia.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await act(async () =>
    root.render(
      <VoiceInput onTranscript={transcript} transcribe={transcribe} />,
    ),
  );
  await act(async () => host.querySelector("button")?.click());
  expect(host.textContent).toContain("Microphone access is blocked");
  await act(async () => host.querySelector("button")?.click());
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Cancel recording")
      ?.click(),
  );
  expect(transcribe).not.toHaveBeenCalled();
  expect(mock.stopped).toHaveBeenCalled();
  await act(async () => root.unmount());
  vi.stubGlobal("MediaRecorder", undefined);
  const next = createRoot(host);
  await act(async () =>
    next.render(
      <VoiceInput onTranscript={transcript} transcribe={transcribe} />,
    ),
  );
  expect(host.textContent).toBe("");
  await act(async () => next.unmount());
  vi.unstubAllGlobals();
});
it("shows safe provider errors, permits retry and cancels transcription without insertion", async () => {
  mockVoice();
  const host = document.createElement("div");
  const root = createRoot(host);
  const onTranscript = vi.fn();
  const cancel = vi.fn();
  let finish: ((text: string) => void) | undefined;
  const render = (transcribe: () => Promise<string | undefined>) => (
    <VoiceInput
      transcribe={transcribe}
      onTranscript={onTranscript}
      onCancelTranscription={cancel}
      error={{
        message: "Transcription unavailable",
        code: "transcription_unavailable",
      }}
    />
  );
  const click = async (text: string) =>
    act(async () =>
      [...host.querySelectorAll("button")]
        .find(
          (b) =>
            b.textContent === text || b.getAttribute("aria-label") === text,
        )
        ?.click(),
    );
  await act(async () => root.render(render(async () => undefined)));
  await click("Start voice input");
  await click("Stop recording");
  expect(host.textContent).toContain("Voice input isn’t set up yet.");
  expect(host.textContent).not.toContain("transcription_unavailable");
  await act(async () =>
    root.render(
      render(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    ),
  );
  await click("Start voice input");
  await click("Stop recording");
  await click("Cancel");
  await act(async () => finish?.("Late"));
  expect(onTranscript).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalled();
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("leaves silent transcripts and unrelated Escape presses out of the draft", async () => {
  mockVoice();
  const host = document.createElement("div");
  const root = createRoot(host);
  const transcript = vi.fn(),
    cancel = vi.fn();
  await act(async () =>
    root.render(
      <VoiceInput
        transcribe={async () => "   "}
        onTranscript={transcript}
        onCancelTranscription={cancel}
      />,
    ),
  );
  await act(async () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(cancel).not.toHaveBeenCalled();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Start voice input"]')
      ?.click(),
  );
  await act(async () =>
    [...host.querySelectorAll("button")]
      .find((b) => b.textContent === "Stop recording")
      ?.click(),
  );
  expect(transcript).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
