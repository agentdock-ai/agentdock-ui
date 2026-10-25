export interface VoiceRecorderState {
  status: "idle" | "requesting" | "recording";
  stream: MediaStream | null;
  startedAt?: number;
  error?: string;
}
export const idleVoiceRecorder: VoiceRecorderState = {
  status: "idle",
  stream: null,
};
export const voiceSupported = () =>
  typeof MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);
export function voiceMimeType() {
  return ["audio/webm;codecs=opus", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}
export function stopVoiceTracks(stream?: MediaStream) {
  stream?.getTracks().forEach((track) => track.stop());
}
export function voiceRecorderError(error: unknown) {
  return error &&
    typeof error === "object" &&
    "name" in error &&
    (error.name === "NotAllowedError" || error.name === "SecurityError")
    ? "Microphone access is blocked. Allow it in the browser’s site settings."
    : "Recording failed. Please try again.";
}
