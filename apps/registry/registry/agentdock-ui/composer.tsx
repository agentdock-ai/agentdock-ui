"use client";
import { insertDraftText } from "@agentdock-ai/ui-core";
import { VoiceInput, type VoiceInputProps } from "./voice-input.js";
import { useId, useLayoutEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
import { Textarea } from "../ui/textarea.js";
import { ComposerAttachmentPicker } from "./composer-attachment-picker.js";
import { ComposerAttachments } from "./composer-attachments.js";
import type { AttachmentDraft } from "./use-chat-attachments.js";
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  waiting,
  cancelling,
  disabled,
  attachments = [],
  attachmentAccept,
  attachmentError,
  attachmentBlocked,
  onFiles,
  onRemoveAttachment,
  onRetryAttachment,
  voice,
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
  attachments?: readonly AttachmentDraft[];
  attachmentAccept?: string;
  attachmentError?: string;
  attachmentBlocked?: boolean;
  onFiles?: (files: readonly File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onRetryAttachment?: (id: string) => void;
  voice?: Omit<VoiceInputProps, "onTranscript" | "disabled">;
  placeholder?: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const cursor = useRef<number | null>(null);
  const composing = useRef(false);
  const hint = useId();
  useLayoutEffect(() => {
    if (input.current) {
      if (cursor.current !== null) {
        input.current.focus();
        input.current.setSelectionRange(cursor.current, cursor.current);
        cursor.current = null;
      }
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 192)}px`;
    }
  }, [value]);
  const canSend =
    (!!value.trim() || attachments.some((item) => item.status === "ready")) &&
    !attachmentBlocked &&
    !busy &&
    !waiting &&
    !disabled;
  return (
    <form
      aria-label="Send a message"
      onDragOver={(event) => {
        if (onFiles && event.dataTransfer.types.includes("Files"))
          event.preventDefault();
      }}
      onDrop={(event) => {
        if (!onFiles || event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="rounded-3xl border border-border bg-card p-2 shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-ring/60 focus-within:ring-4 focus-within:ring-ring/10 motion-reduce:transition-none"
    >
      {attachments.length > 0 && (
        <ComposerAttachments
          items={attachments}
          onRemove={onRemoveAttachment ?? (() => {})}
          onRetry={onRetryAttachment ?? (() => {})}
        />
      )}
      {attachmentError && (
        <p
          role="alert"
          className="px-2.5 pb-2 text-xs leading-5 text-destructive"
        >
          {attachmentError}
        </p>
      )}
      <Textarea
        ref={input}
        aria-label="Message"
        aria-describedby={hint}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          if (onFiles && event.clipboardData.files.length > 0) {
            event.preventDefault();
            if (!disabled) onFiles(Array.from(event.clipboardData.files));
          }
        }}
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
      <div className="flex min-h-8 flex-wrap items-center justify-end gap-2 pt-1">
        {onFiles && (
          <ComposerAttachmentPicker
            accept={attachmentAccept}
            disabled={disabled}
            onFiles={onFiles}
          />
        )}
        {voice?.transcribe && (
          <VoiceInput
            {...voice}
            onCancelTranscription={() => {
              voice.onCancelTranscription?.();
              input.current?.focus();
            }}
            disabled={disabled}
            onTranscript={(text) => {
              const inserted = insertDraftText(
                value,
                text,
                input.current?.selectionStart,
                input.current?.selectionEnd,
              );
              cursor.current = inserted.cursor;
              onChange(inserted.text);
            }}
          />
        )}
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
            size="icon"
            className="size-8 [@media(pointer:coarse)]:size-9"
          >
            <ChatIcon
              icon={Square}
              size={12}
              className="shrink-0"
              fill="currentColor"
              aria-hidden="true"
            />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={!canSend}
            aria-label="Send message"
            title="Send message"
            size="icon"
            className="size-8 [@media(pointer:coarse)]:size-9"
          >
            <ChatIcon
              icon={ArrowUp}
              size={18}
              className="shrink-0"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
    </form>
  );
}
