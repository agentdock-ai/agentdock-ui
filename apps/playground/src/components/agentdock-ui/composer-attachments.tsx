import { FileText, LoaderCircle, RotateCw, X } from "lucide-react";
import { ChatIcon } from "./icon";
import type { AttachmentDraft } from "./use-chat-attachments";

export function ComposerAttachments({
  items,
  onRemove,
  onRetry,
}: {
  items: readonly AttachmentDraft[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const iconButton =
    "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none [@media(pointer:coarse)]:size-8";
  return (
    <ul
      aria-label="Message attachments"
      className="flex flex-wrap gap-2 px-0.5 pb-2 pt-0.5"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border bg-background p-1.5 pr-1 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] ${item.status === "error" ? "border-destructive/30" : "border-border"}`}
        >
          <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt=""
                className={`size-full object-cover ${item.status === "uploading" ? "opacity-50" : ""}`}
              />
            ) : (
              <ChatIcon icon={FileText} size={16} />
            )}
            {item.status === "uploading" && (
              <ChatIcon
                icon={LoaderCircle}
                size={14}
                className={`absolute motion-safe:animate-spin ${item.previewUrl ? "text-foreground" : "text-muted-foreground"}`}
              />
            )}
          </span>
          <div className="min-w-0 max-w-44">
            <p
              className="truncate text-[12.5px] font-medium leading-4"
              title={item.file.name}
            >
              {item.file.name}
            </p>
            <p
              role="status"
              className={`mt-0.5 truncate text-[11px] leading-4 ${item.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {item.status === "uploading"
                ? "Uploading…"
                : item.status === "error"
                  ? item.error || "Upload failed"
                  : `${Math.max(1, Math.round(item.file.size / 1_000))} KB`}
            </p>
          </div>
          <div className="flex items-center">
            {item.status === "error" && (
              <button
                type="button"
                aria-label={`Retry upload ${item.file.name}`}
                onClick={() => onRetry(item.id)}
                className={iconButton}
              >
                <ChatIcon icon={RotateCw} size={12} />
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove attachment ${item.file.name}`}
              onClick={() => onRemove(item.id)}
              className={iconButton}
            >
              <ChatIcon icon={X} size={13} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
