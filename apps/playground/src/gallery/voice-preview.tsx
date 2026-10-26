import { useState } from "react";
import { Composer } from "../components/agentdock-ui/composer";
export function VoicePreview() {
  const [value, setValue] = useState("");
  return (
    <div className="w-full">
      <Composer
        value={value}
        onChange={setValue}
        onSubmit={() => {}}
        busy={false}
        waiting={false}
        cancelling={false}
        voice={{
          transcribe: async () => {
            await new Promise((resolve) => setTimeout(resolve, 600));
            return "This is a voice draft. Edit it before sending.";
          },
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Try the microphone. This preview uses a fixed transcript and never sends
        a message.
      </p>
    </div>
  );
}
