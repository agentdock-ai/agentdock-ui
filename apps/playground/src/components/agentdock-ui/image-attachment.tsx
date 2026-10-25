"use client";
import { useRef, useState } from "react";
import { ExternalLink, ImageOff, X } from "lucide-react";
import { ChatIcon } from "./icon";

/** Presentation only: image URLs come from the consuming app's content blocks. */
export function ImageAttachment({ url }: { url: string }) {
  const preview = useRef<HTMLDialogElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const iconButton =
    "flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none";
  return (
    <div className="w-fit max-w-full">
      <button
        type="button"
        aria-label="Preview attached image"
        aria-haspopup="dialog"
        onClick={() => preview.current?.showModal()}
        className="flex size-24 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-border bg-muted shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        {unavailable ? (
          <ChatIcon
            icon={ImageOff}
            size={20}
            className="text-muted-foreground"
          />
        ) : (
          <img
            src={url}
            alt="Attached image"
            loading="lazy"
            onError={() => setUnavailable(true)}
            className="size-full object-cover"
          />
        )}
      </button>
      <dialog
        ref={preview}
        aria-label="Attached image preview"
        onClick={(event) => {
          if (event.target === event.currentTarget) preview.current?.close();
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-auto rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div>
          <header className="flex items-center justify-between gap-3 border-b border-border py-2 pl-4 pr-2">
            <span className="text-[13px] font-medium">Attached image</span>
            <div className="flex items-center gap-0.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open original image"
                className={iconButton}
              >
                <ChatIcon icon={ExternalLink} size={16} />
              </a>
              <button
                type="button"
                autoFocus
                aria-label="Close image preview"
                onClick={() => preview.current?.close()}
                className={iconButton}
              >
                <ChatIcon icon={X} size={16} />
              </button>
            </div>
          </header>
          {unavailable ? (
            <p
              role="status"
              className="p-10 text-center text-[13px] text-muted-foreground"
            >
              Image preview unavailable.
            </p>
          ) : (
            <img
              src={url}
              alt="Attached image"
              loading="lazy"
              onError={() => setUnavailable(true)}
              className="max-h-[calc(100dvh-7rem)] w-full bg-muted/40 object-contain"
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
