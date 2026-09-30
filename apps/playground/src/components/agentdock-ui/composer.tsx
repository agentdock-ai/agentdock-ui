"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  waiting,
  cancelling,
  disabled,
  placeholder = "Send a message…",
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy: boolean;
  waiting: boolean;
  cancelling: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const hint = useId();
  useLayoutEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 192)}px`;
    }
  }, [value]);
  const canSend = !!value.trim() && !busy && !waiting && !disabled;
  return (
    <form
      aria-label="Send a message"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="rounded-2xl border border-foreground/25 bg-muted/50 p-2 transition-colors focus-within:border-ring motion-reduce:transition-none"
    >
      <Textarea
        ref={input}
        aria-label="Message"
        aria-describedby={hint}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing &&
            !composing.current &&
            event.keyCode !== 229
          ) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
      />
      <div className="flex min-h-7 items-center justify-end gap-2 pt-1">
        <p id={hint} className="sr-only">
          {waiting ? (
            "Waiting for your response"
          ) : busy ? (
            "You can write your next message"
          ) : (
            <>
              <span className="hidden sm:inline">Enter to send · </span>Shift +
              Enter for a new line
            </>
          )}
        </p>
        {busy && !waiting && onStop ? (
          <Button
            aria-label={cancelling ? "Stopping run" : "Stop run"}
            title="Stop run"
            variant="primary"
            disabled={cancelling || disabled}
            onClick={onStop}
            className="size-7 min-h-7 rounded-lg px-0 [@media(pointer:coarse)]:size-9"
          >
            <Square size={12} fill="currentColor" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={!canSend}
            aria-label="Send message"
            title="Send message"
            className="size-7 min-h-7 rounded-lg px-0 [@media(pointer:coarse)]:size-9"
          >
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
