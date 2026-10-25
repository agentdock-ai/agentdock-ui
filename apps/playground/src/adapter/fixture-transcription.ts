import type { ChatAdapter } from "@agentdock-ai/react";
export const fixtureTranscription: NonNullable<
  ChatAdapter["transcribe"]
> = async ({ signal }) => {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Transcription cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 600);
    signal.addEventListener("abort", abort, { once: true });
  });
  return { text: "This is a voice draft. Edit it before sending." };
};
