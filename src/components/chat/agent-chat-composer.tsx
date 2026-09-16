import { type FormEvent, type KeyboardEvent } from "react";
import { NativeButton, NativeTextarea } from "../ui/native.js";
import { cn } from "../ui/class-names.js";

export interface AgentChatComposerProps {
  value: string;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  footerClassName?: string;
  hintClassName?: string;
  submitClassName?: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
}

export function AgentChatComposer({
  value,
  disabled = false,
  busy = false,
  placeholder = "Message your agent…",
  className,
  inputClassName,
  footerClassName,
  hintClassName,
  submitClassName,
  onChange,
  onSubmit,
}: AgentChatComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim() || disabled || busy) return;
    void onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className={cn("ad-composer", className)} onSubmit={submit} data-slot="chat-composer">
      <NativeTextarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        aria-label="Message your agent"
        className={inputClassName}
      />
      <div className={cn("ad-composer-footer", footerClassName)}>
        <span className={hintClassName}>Enter to send · Shift + Enter for a new line</span>
        <NativeButton
          type="submit"
          disabled={!value.trim() || disabled || busy}
          aria-label="Send message"
          className={submitClassName}
        >
          {busy && !disabled ? "…" : "↑"}
        </NativeButton>
      </div>
    </form>
  );
}
