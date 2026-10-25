"use client";
import { Mic } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
import { AlertStatus } from "./alert.js";
import { VoiceLevel } from "./voice-level.js";
import type { useVoiceRecorder } from "./use-voice-recorder.js";
import type { useVoiceTranscript } from "./use-voice-transcript.js";
interface ControlsProps {
  recorder: ReturnType<typeof useVoiceRecorder>;
  transcript: ReturnType<typeof useVoiceTranscript>;
  timer: string;
  level: number;
  disabled?: boolean;
}
function PendingVoice({ text, cancel }: { text: string; cancel: () => void }) {
  return (
    <>
      <span role="status" className="text-xs text-muted-foreground">
        {text}
      </span>
      <Button onClick={cancel}>Cancel</Button>
    </>
  );
}
function RecordingVoice({
  timer,
  level,
  transcript,
}: Pick<ControlsProps, "timer" | "level" | "transcript">) {
  return (
    <>
      <AlertStatus tone="error" icon={Mic}>
        Recording{" "}
        <span aria-live="off" className="font-mono tabular-nums">
          {timer}
        </span>
      </AlertStatus>
      <VoiceLevel level={level} />
      <Button onClick={() => void transcript.stop()}>Stop recording</Button>
      <Button onClick={transcript.cancel}>Cancel recording</Button>
    </>
  );
}
export function VoiceInputControls(props: ControlsProps) {
  const { recorder, transcript, disabled } = props;
  if (transcript.busy)
    return <PendingVoice text="Transcribing…" cancel={transcript.cancel} />;
  if (recorder.status === "requesting")
    return (
      <PendingVoice text="Requesting microphone…" cancel={transcript.cancel} />
    );
  if (recorder.status === "recording")
    return (
      <RecordingVoice
        timer={props.timer}
        level={props.level}
        transcript={transcript}
      />
    );
  return (
    <Button
      size="icon"
      aria-label="Start voice input"
      title="Voice input"
      disabled={disabled}
      onClick={() => {
        transcript.reset();
        void recorder.start();
      }}
    >
      <ChatIcon icon={Mic} size={16} />
    </Button>
  );
}
