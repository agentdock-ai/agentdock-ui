import { useVoiceTranscript } from "./use-voice-transcript.js";
import { Mic } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
import { AlertStatus, InlineAlert } from "./alert.js";
import { useVoiceRecorder } from "./use-voice-recorder.js";
import { useAudioLevel } from "./use-audio-level.js";
import { useVoiceTimer } from "./use-voice-timer.js";
import { VoiceLevel } from "./voice-level.js";
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
  const { busy, failed, cancel, stop } = transcript;
  const error =
    recorder.error ||
    (failed
      ? props.error?.message ||
        "Speech could not be transcribed. Please try again."
      : undefined);
  return (
    <div className="mr-auto min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {busy ? (
          <>
            <span role="status" className="text-xs text-muted-foreground">
              Transcribing…
            </span>
            <Button onClick={cancel}>Cancel</Button>
          </>
        ) : recorder.status === "requesting" ? (
          <>
            <span role="status" className="text-xs text-muted-foreground">
              Requesting microphone…
            </span>
            <Button onClick={cancel}>Cancel</Button>
          </>
        ) : recorder.status === "recording" ? (
          <>
            <AlertStatus tone="error" icon={Mic}>
              Recording{" "}
              <span aria-live="off" className="font-mono tabular-nums">
                {timer}
              </span>
            </AlertStatus>
            <VoiceLevel level={level} />
            <Button onClick={() => void stop()}>Stop recording</Button>
            <Button onClick={cancel}>Cancel recording</Button>
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
          >
            <ChatIcon icon={Mic} size={16} />
          </Button>
        )}
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
