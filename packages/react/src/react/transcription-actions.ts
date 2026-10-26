import type { ChatAdapter } from "./chat-adapter.js";
import type { ChatActionState } from "./chat-actions.js";
import { actionErrorCode } from "./action-error-code.js";
/** Independent lifetime: stopping a run never aborts speech transcription. */
class TranscriptionActions {
  private controller?: AbortController;
  private disposed = false;
  constructor(
    private adapter: ChatAdapter,
    private changed: (patch: Partial<ChatActionState>) => void,
  ) {}
  private update(patch: Partial<ChatActionState>) {
    if (!this.disposed) this.changed(patch);
  }
  transcribe = async (
    audio: Blob,
    mimeType: string,
  ): Promise<string | undefined> => {
    if (!this.adapter.transcribe || this.controller || this.disposed) return;
    const current = new AbortController();
    this.controller = current;
    this.update({ transcribing: true, actionError: null });
    try {
      const result = await abortableTranscription(
        () =>
          this.adapter.transcribe?.({
            audio,
            mimeType,
            signal: current.signal,
          }),
        current.signal,
      );
      if (!current.signal.aborted && !this.disposed) return result?.text;
    } catch (error) {
      if (!current.signal.aborted && !this.disposed)
        this.update({
          actionError: {
            scope: "transcribe",
            message:
              "Speech could not be transcribed. Try again when you’re ready.",
            ...actionErrorCode(error),
          },
        });
    } finally {
      this.controller = undefined;
      this.update({ transcribing: false });
    }
  };
  cancelTranscription = () => {
    this.controller?.abort();
  };
  dispose = () => {
    this.disposed = true;
    this.controller?.abort();
  };
}
export function createTranscriptionActions(
  adapter: ChatAdapter,
  changed: (patch: Partial<ChatActionState>) => void,
) {
  return new TranscriptionActions(adapter, changed);
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
