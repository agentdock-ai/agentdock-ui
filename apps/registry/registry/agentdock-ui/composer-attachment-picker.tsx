"use client";
import { useRef } from "react";
import { Paperclip, Image } from "lucide-react";
import { ChatIcon } from "./icon.js";

export function ComposerAttachmentPicker({
  accept,
  disabled,
  onFiles,
}: {
  accept?: string;
  disabled?: boolean;
  onFiles: (files: readonly File[]) => void;
}) {
  const files = useRef<HTMLInputElement>(null);
  const images = useRef<HTMLInputElement>(null);
  const imageAccept = accept
    ? accept
        .split(",")
        .filter((type) => type.trim().startsWith("image/"))
        .join(",")
    : "image/*";
  const select = (input: HTMLInputElement) => {
    onFiles(Array.from(input.files ?? []));
    input.value = "";
  };
  const style =
    "flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [@media(pointer:coarse)]:size-9";
  return (
    <div className="mr-auto flex items-center gap-0.5">
      <input
        ref={files}
        type="file"
        multiple
        accept={accept}
        aria-label="Choose files"
        hidden
        onChange={(event) => select(event.currentTarget)}
      />
      <input
        ref={images}
        type="file"
        multiple
        accept={imageAccept}
        aria-label="Choose images"
        hidden
        onChange={(event) => select(event.currentTarget)}
      />
      <button
        type="button"
        aria-label="Attach files"
        title="Attach files"
        disabled={disabled}
        onClick={() => files.current?.click()}
        className={style}
      >
        <ChatIcon icon={Paperclip} size={16} />
      </button>
      {imageAccept && (
        <button
          type="button"
          aria-label="Attach images"
          title="Attach images"
          disabled={disabled}
          onClick={() => images.current?.click()}
          className={style}
        >
          <ChatIcon icon={Image} size={16} />
        </button>
      )}
    </div>
  );
}
