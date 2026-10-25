import type { ChatAdapter } from "./chat-adapter.js";
import type { ChatActionState } from "./chat-actions.js";
import { actionErrorCode } from "./action-error-code.js";
/** Independent lifetime: stopping a run never aborts speech transcription. */
export function createTranscriptionActions(
  adapter: ChatAdapter,
  changed: (patch: Partial<ChatActionState>) => void,
) {
  let controller: AbortController | undefined;
  let disposed = false;
  const update = (patch: Partial<ChatActionState>) => {
    if (!disposed) changed(patch);
  };
  return {
    async transcribe(
      audio: Blob,
      mimeType: string,
    ): Promise<string | undefined> {
      if (!adapter.transcribe || controller || disposed) return;
      const current = new AbortController();
      controller = current;
      update({ transcribing: true, actionError: null });
      try {
        const result = await abortableTranscription(
          () =>
            adapter.transcribe?.({ audio, mimeType, signal: current.signal }),
          current.signal,
        );
        if (!current.signal.aborted && !disposed) return result?.text;
      } catch (error) {
        if (!current.signal.aborted && !disposed)
          update({
            actionError: {
              scope: "transcribe",
              message:
                "Speech could not be transcribed. Try again when you’re ready.",
              ...actionErrorCode(error),
            },
          });
      } finally {
        controller = undefined;
        update({ transcribing: false });
      }
    },
    cancelTranscription() {
      controller?.abort();
    },
    dispose() {
      disposed = true;
      controller?.abort();
    },
  };
}
function abortableTranscription(
  source: () => ReturnType<NonNullable<ChatAdapter["transcribe"]>> | undefined,
  signal: AbortSignal,
) {
  return new Promise<{ text: string } | undefined>((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Transcription cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve()
      .then(source)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
