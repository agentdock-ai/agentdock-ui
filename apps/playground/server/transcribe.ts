import type { IncomingMessage, ServerResponse } from "node:http";
import { readTranscriptionAudio } from "./transcribe-audio.js";
import {
  transcribeAudio,
  type PlaygroundTranscriptionOptions,
} from "./transcribe-provider.js";
import { TranscriptionError } from "./transcribe-error.js";
function write(response: ServerResponse, status: number, body: unknown) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}
export async function handleTranscription(
  request: IncomingMessage,
  response: ServerResponse,
  options: PlaygroundTranscriptionOptions = {},
) {
  if (request.method !== "POST") {
    write(response, 405, {
      code: "method_not_allowed",
      message: "Use POST /api/transcribe.",
    });
    return;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => {
    if (!response.writableEnded) abort();
  };
  request.once("aborted", abort);
  response.once("close", close);
  try {
    const audio = await readTranscriptionAudio(request);
    write(
      response,
      200,
      await transcribeAudio(audio, options, controller.signal),
    );
  } catch (error) {
    writeError(response, error);
  } finally {
    request.removeListener("aborted", abort);
    response.removeListener("close", close);
  }
}

function writeError(response: ServerResponse, error: unknown) {
  write(response, error instanceof TranscriptionError ? error.status : 502, {
    code:
      error instanceof TranscriptionError ? error.code : "transcription_failed",
    message:
      error instanceof TranscriptionError
        ? error.message
        : "Speech could not be transcribed. Please try again.",
  });
}
