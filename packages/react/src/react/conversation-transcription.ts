import type { ChatAdapter } from "./chat-adapter.js";
/** Multipart requests use the same app-owned fetcher and authorization as conversation calls. */
export function conversationTranscription(
  request: (path: string, init: RequestInit) => Promise<unknown>,
): NonNullable<ChatAdapter["transcribe"]> {
  return async ({ audio, mimeType, signal }) => {
    const form = new FormData();
    form.set(
      "audio",
      new Blob([audio], { type: mimeType }),
      mimeType.includes("mp4") ? "recording.mp4" : "recording.webm",
    );
    const result = await request("/transcribe", {
      method: "POST",
      body: form,
      signal,
    });
    if (
      result !== null &&
      typeof result === "object" &&
      "text" in result &&
      typeof result.text === "string"
    )
      return { text: result.text };
    throw new Error("The transcription response did not contain text.");
  };
}
