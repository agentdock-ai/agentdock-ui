"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
export function ChatActionBar({ text }: { text: string }) {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="-ml-1.5 mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Button
        aria-label={status === "Copied" ? "Answer copied" : "Copy answer"}
        title="Copy answer"
        size="icon"
        className="size-7 text-muted-foreground/80 [@media(pointer:coarse)]:size-9"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("Copied");
          } catch {
            setStatus("Copy unavailable. Select the text to copy.");
          }
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setStatus(""), 2500);
        }}
      >
        {status === "Copied" ? (
          <ChatIcon icon={Check} size={14} aria-hidden="true" />
        ) : (
          <ChatIcon icon={Copy} size={14} aria-hidden="true" />
        )}
      </Button>
      <span role="status" className="text-[12px]">
        {status}
      </span>
    </div>
  );
}
