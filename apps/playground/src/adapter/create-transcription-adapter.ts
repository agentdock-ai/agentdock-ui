import type { ChatAdapter } from "@agentdock-ai/react";
export function createTranscriptionAdapter(
  request: typeof fetch,
): NonNullable<ChatAdapter["transcribe"]> {
  return async ({ audio, mimeType, signal }) => {
    const form = new FormData();
    form.set(
      "audio",
      new Blob([audio], { type: mimeType }),
      mimeType.includes("mp4") ? "recording.mp4" : "recording.webm",
    );
    const response = await request("/api/transcribe", {
      method: "POST",
      credentials: "same-origin",
      body: form,
      signal,
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw transcriptionError(body);
    if (
      body &&
      typeof body === "object" &&
      "text" in body &&
      typeof body.text === "string"
    )
      return { text: body.text };
    throw new Error("The transcription response did not contain text.");
  };
}

function transcriptionError(body: unknown) {
  const record = body && typeof body === "object" ? body : {};
  const message =
    "message" in record && typeof record.message === "string"
      ? record.message
      : "Speech could not be transcribed.";
  const code =
    "code" in record &&
    typeof record.code === "string" &&
    /^[a-z][a-z0-9_.]{0,63}$/.test(record.code)
      ? record.code
      : undefined;
  return Object.assign(new Error(message), { code });
}
