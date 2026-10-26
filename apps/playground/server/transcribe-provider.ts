import { TranscriptionError } from "./transcribe-error.js";
export interface PlaygroundTranscriptionOptions {
  apiKey?: string;
  model?: string;
  request?: typeof fetch;
}
/** Uses file transcription rather than sending audio into the chat model. */
export async function transcribeAudio(
  input: { audio: Blob; filename: string },
  options: PlaygroundTranscriptionOptions,
  signal: AbortSignal,
) {
  if (!options.apiKey?.trim())
    throw new TranscriptionError(
      501,
      "transcription_unavailable",
      "Set PLAYGROUND_STT_API_KEY or OPENAI_API_KEY on the playground server to enable transcription.",
    );
  const form = new FormData();
  form.set("file", input.audio, input.filename);
  form.set("model", options.model?.trim() || "gpt-transcribe");
  const response = await (options.request ?? fetch)(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey.trim()}` },
      body: form,
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    },
  );
  if (!response.ok)
    throw new TranscriptionError(
      502,
      "transcription_failed",
      "The speech provider could not transcribe this recording. Please try again.",
    );
  return transcriptResult(await response.json());
}
function transcriptResult(result: unknown) {
  if (
    !result ||
    typeof result !== "object" ||
    !("text" in result) ||
    typeof result.text !== "string"
  )
    throw new TranscriptionError(
      502,
      "transcription_failed",
      "The speech provider returned an invalid transcript.",
    );
  return { text: result.text };
}
