import { useEffect, useState } from "react";
import { audioLevelSession } from "./audio-level-session";
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || typeof AudioContext === "undefined") {
      setLevel(0);
      return;
    }
    return audioLevelSession(stream, setLevel);
  }, [stream]);
  return level;
}
