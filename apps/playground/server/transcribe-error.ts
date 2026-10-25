export class TranscriptionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
