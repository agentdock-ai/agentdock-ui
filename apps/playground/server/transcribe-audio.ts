import type { IncomingMessage } from "node:http";
import { TranscriptionError, MAX_AUDIO_BYTES } from "./transcribe-error.js";
const formats: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-m4a": "m4a",
};
async function readMultipart(request: IncomingMessage, contentType: string) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const input of request) {
    const chunk: unknown = input;
    if (!Buffer.isBuffer(chunk) && typeof chunk !== "string")
      throw new TranscriptionError(
        400,
        "invalid_audio",
        "Invalid audio upload.",
      );
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_AUDIO_BYTES + 65536)
      throw new TranscriptionError(
        413,
        "audio_too_large",
        "Audio must be 10 MB or smaller.",
      );
    chunks.push(bytes);
  }
  const body = Uint8Array.from(Buffer.concat(chunks));
  try {
    return await new Request("http://localhost/transcribe", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }).formData();
  } catch {
    throw new TranscriptionError(
      400,
      "invalid_audio",
      "Send one audio file as multipart/form-data.",
    );
  }
}
export async function readTranscriptionAudio(request: IncomingMessage) {
  const contentType = request.headers["content-type"] ?? "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "multipart/form-data")
    throw new TranscriptionError(
      415,
      "unsupported_audio_type",
      "Use multipart/form-data with an audio file.",
    );
  const form = await readMultipart(request, contentType),
    audio = form.get("audio");
  if (
    !(audio instanceof Blob) ||
    form.getAll("audio").length !== 1 ||
    !audio.size
  )
    throw new TranscriptionError(
      400,
      "invalid_audio",
      "Record some speech and send one audio file.",
    );
  if (audio.size > MAX_AUDIO_BYTES)
    throw new TranscriptionError(
      413,
      "audio_too_large",
      "Audio must be 10 MB or smaller.",
    );
  const type = audio.type.split(";")[0].trim().toLowerCase(),
    extension = formats[type];
  if (!extension)
    throw new TranscriptionError(
      415,
      "unsupported_audio_type",
      "Use WebM, MP4, MP3, WAV, Ogg or FLAC audio.",
    );
  return { audio, filename: `recording.${extension}` };
}
