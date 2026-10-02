import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { ChatIcon } from "./components/agentdock-ui/icon";

export function ConnectionSettings({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open) dialog.current?.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
    >
      <div>
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id={title} className="text-sm font-medium">
            Connection settings
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="workspace-action"
          >
            <ChatIcon icon={X} size={16} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
