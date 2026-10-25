"use client";
import { useVoiceTranscript } from "./use-voice-transcript";
import { InlineAlert } from "./alert";
import { useVoiceRecorder } from "./use-voice-recorder";
import { useAudioLevel } from "./use-audio-level";
import { useVoiceTimer } from "./use-voice-timer";
import { VoiceInputControls } from "./voice-input-controls";
export interface VoiceInputProps {
  transcribe?: (audio: Blob, mimeType: string) => Promise<string | undefined>;
  onTranscript: (text: string) => void;
  onCancelTranscription?: () => void;
  transcribing?: boolean;
  error?: { message: string; code?: string };
  disabled?: boolean;
  maxDurationMs?: number;
}
export function VoiceInput(props: VoiceInputProps) {
  const recorder = useVoiceRecorder(props.maxDurationMs);
  const level = useAudioLevel(recorder.stream);
  const timer = useVoiceTimer(recorder.startedAt);
  const transcript = useVoiceTranscript(props, recorder);
  if (!recorder.supported || !props.transcribe) return null;
  const { failed } = transcript;
  const error =
    recorder.error ||
    (failed
      ? props.error?.message ||
        "Speech could not be transcribed. Please try again."
      : undefined);
  return (
    <div className="mr-auto min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <VoiceInputControls
          recorder={recorder}
          transcript={transcript}
          timer={timer}
          level={level}
          disabled={props.disabled}
        />
      </div>
      {error && (
        <div className="mt-2">
          <InlineAlert>
            {error}
            {failed && props.error?.code && (
              <span className="ml-2 font-mono text-xs">{props.error.code}</span>
            )}
          </InlineAlert>
        </div>
      )}
    </div>
  );
}
