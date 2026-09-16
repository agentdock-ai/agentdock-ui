import { type FormEvent, type KeyboardEvent } from "react";
import { Form } from "radix-ui";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "../ui/button.js";
import { Textarea } from "../ui/textarea.js";
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
  onInterrupt?: () => void | Promise<void>;
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
  onInterrupt,
}: AgentChatComposerProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    if (busy) {
      if (onInterrupt) void onInterrupt();
      return;
    }
    if (!value.trim()) return;
    void onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <Form.Root className={cn("ad-composer", className)} onSubmit={submit} data-slot="chat-composer">
      <Form.Field name="message">
        <Form.Control asChild>
          <Textarea
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            aria-label="Message your agent"
            className={inputClassName}
          />
        </Form.Control>
      </Form.Field>
      <div className={cn("ad-composer-footer", footerClassName)}>
        <span className={hintClassName}>Enter to send · Shift + Enter for a new line</span>
        <Form.Submit asChild>
          <Button
            type="submit"
            disabled={disabled || (!busy && !value.trim())}
            aria-label={busy ? "Interrupt agent" : "Send message"}
            className={submitClassName}
          >
            {busy && !disabled ? <Square aria-hidden="true" data-icon="inline-end" /> : <ArrowUp aria-hidden="true" data-icon="inline-end" />}<span className="ad-sr-only">{busy ? "Interrupt agent" : "Send message"}</span>
          </Button>
        </Form.Submit>
      </div>
    </Form.Root>
  );
}
