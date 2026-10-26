"use client";
import { Mic } from "lucide-react";
import {
  useAudioLevel,
  useVoiceRecorder,
  useVoiceTimer,
  useVoiceTranscript,
  type VoiceTranscriptOptions,
} from "./use-voice-input.js";
import { AlertStatus, InlineAlert } from "./alert.js";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";

export interface VoiceInputProps extends VoiceTranscriptOptions {
  error?: { message: string; code?: string };
  maxDurationMs?: number;
}

/** Plain wording for codes the transcription endpoint is known to return. */
const voiceErrors: Record<string, string> = {
  transcription_unavailable:
    "Voice input isn’t set up yet. Add a speech-to-text API key on the server to turn it on.",
  transcription_failed: "Couldn’t transcribe that recording. Please try again.",
};

/** Mic button → record → transcribe into the draft. Never sends on its own. */
export function VoiceInput(props: VoiceInputProps) {
  const recorder = useVoiceRecorder(props.maxDurationMs);
  const level = useAudioLevel(recorder.stream);
  const timer = useVoiceTimer(recorder.startedAt);
  const transcript = useVoiceTranscript(props, recorder);
  if (!recorder.supported || !props.transcribe) return null;
  const failure = transcript.failed ? props.error : undefined;
  const known = failure?.code ? voiceErrors[failure.code] : undefined;
  const error =
    recorder.error ||
    known ||
    (transcript.failed
      ? (failure?.message ?? "Didn’t catch that. Try speaking a little longer.")
      : undefined);
  return (
    // `contents` lets the error take its own full-width row in the composer footer.
    <div className="contents">
      <div className="flex flex-wrap items-center gap-2">
        {transcript.busy || recorder.status === "requesting" ? (
          <>
            <span role="status" className="text-xs text-muted-foreground">
              {transcript.busy ? "Transcribing…" : "Requesting microphone…"}
            </span>
            <Button autoFocus onClick={transcript.cancel}>
              Cancel
            </Button>
          </>
        ) : recorder.status === "recording" ? (
          <>
            <span role="status" className="sr-only">
              Recording started.
            </span>
            <AlertStatus tone="error" icon={Mic}>
              Recording{" "}
              <span aria-live="off" className="font-mono tabular-nums">
                {timer}
              </span>
            </AlertStatus>
            <VoiceLevel level={level} />
            <Button autoFocus onClick={() => void transcript.stop()}>
              Stop recording
            </Button>
            <Button onClick={transcript.cancel}>Cancel recording</Button>
          </>
        ) : (
          <Button
            size="icon"
            aria-label="Start voice input"
            title="Voice input"
            disabled={props.disabled}
            onClick={() => {
              transcript.reset();
              void recorder.start();
            }}
            className="size-8"
          >
            <ChatIcon icon={Mic} size={16} />
          </Button>
        )}
      </div>
      {error && (
        <div className="order-last basis-full">
          <InlineAlert>
            {error}
            {failure?.code && !known && (
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                {failure.code}
              </span>
            )}
          </InlineAlert>
        </div>
      )}
    </div>
  );
}

export function VoiceLevel({ level }: { level: number }) {
  return (
    <span
      role="meter"
      aria-label="Microphone level"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Math.round(level * 100) / 100}
      className="inline-flex h-4 w-12 items-center"
    >
      <span className="h-2 w-full overflow-hidden rounded bg-muted motion-reduce:hidden">
        <span
          className="block h-full rounded bg-emerald-600 dark:bg-emerald-400"
          style={{ width: `${Math.max(5, level * 100)}%` }}
        />
      </span>
      <span
        aria-hidden="true"
        className="hidden h-2 w-6 rounded bg-emerald-600 motion-reduce:block dark:bg-emerald-400"
      />
    </span>
  );
}
