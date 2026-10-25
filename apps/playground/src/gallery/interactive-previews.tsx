import { useMemo, useState } from "react";
import type { JsonValue } from "@agentdock-ai/ui-core";
import { Chat } from "../components/agentdock-ui/chat";
import { Composer } from "../components/agentdock-ui/composer";
import { ComposerAttachments } from "../components/agentdock-ui/composer-attachments";
import { ComposerAttachmentPicker } from "../components/agentdock-ui/composer-attachment-picker";
import {
  useChatAttachments,
  type AttachmentDraft,
} from "../components/agentdock-ui/use-chat-attachments";
import { ApprovalCard } from "../components/agentdock-ui/approval-card";
import { InterruptCard } from "../components/agentdock-ui/interrupt-card";
import type { RenderApproval } from "@agentdock-ai/ui-core";
import { Suggestions } from "../components/agentdock-ui/empty-state";
import { ThreadSidebar } from "../components/agentdock-ui/thread-sidebar";
import { ChatWorkspace } from "../components/agentdock-ui/chat-workspace";
import { ScrollToLatest } from "../components/agentdock-ui/scroll-to-latest";
import { createFixtureChatAdapter } from "../adapter/create-fixture-chat-adapter";
import {
  approval,
  batchApproval,
  createPreviewStore,
  singleApproval,
  toolRisk,
  localAttachments,
  suggestions,
  threads,
} from "./fixtures";

export function ChatPreview() {
  const [store] = useState(() => createPreviewStore());
  const adapter = useMemo(
    () => ({
      ...createFixtureChatAdapter(store),
      attachments: localAttachments,
    }),
    [store],
  );
  return <Chat adapter={adapter} store={store} />;
}

export function ComposerPreview() {
  const [value, setValue] = useState("Tell me more about this idea.");
  const [sent, setSent] = useState("");
  const attachments = useChatAttachments(localAttachments);
  return (
    <div className="w-full">
      <Composer
        value={value}
        onChange={setValue}
        onSubmit={() => {
          const files = attachments.take();
          setSent(
            `Sent${files.length ? ` with ${files.length} attachment${files.length === 1 ? "" : "s"}` : ""}: ${value || files.map((item) => item.file.name).join(", ")}`,
          );
          setValue("");
        }}
        busy={false}
        waiting={false}
        cancelling={false}
        attachments={attachments.items}
        attachmentAccept={localAttachments.accept}
        attachmentError={attachments.error}
        attachmentBlocked={attachments.blocked}
        onFiles={attachments.add}
        onRemoveAttachment={attachments.remove}
        onRetryAttachment={attachments.retry}
      />
      {sent && (
        <p role="status" className="gallery-feedback">
          {sent}
        </p>
      )}
    </div>
  );
}

export function AttachmentsPreview() {
  const [items, setItems] = useState<AttachmentDraft[]>(() => [
    {
      id: "notes",
      file: new File(["Project notes"], "notes.md", { type: "text/markdown" }),
      status: "ready",
    },
    {
      id: "outline",
      file: new File(["Draft outline"], "outline.txt", { type: "text/plain" }),
      status: "uploading",
    },
    {
      id: "brief",
      file: new File(["Project brief"], "brief.pdf", {
        type: "application/pdf",
      }),
      status: "error",
      error: "Upload failed",
    },
  ]);
  return (
    <ComposerAttachments
      items={items}
      onRemove={(id) =>
        setItems((current) => current.filter((item) => item.id !== id))
      }
      onRetry={(id) =>
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: "ready", error: undefined }
              : item,
          ),
        )
      }
    />
  );
}

export function AttachmentPickerPreview() {
  const attachments = useChatAttachments(localAttachments);
  return (
    <div>
      <ComposerAttachmentPicker
        accept={localAttachments.accept}
        onFiles={attachments.add}
      />
      {attachments.items.length > 0 && (
        <ComposerAttachments
          items={attachments.items}
          onRemove={attachments.remove}
          onRetry={attachments.retry}
        />
      )}
      {attachments.error && (
        <p role="alert" className="gallery-feedback text-destructive">
          {attachments.error}
        </p>
      )}
    </div>
  );
}

export function ApprovalPreview({
  sample = approval,
  ttlMinutes,
}: {
  sample?: RenderApproval;
  ttlMinutes?: number;
}) {
  const [decisions, setDecisions] = useState<readonly JsonValue[] | null>(null);
  const [expiresAt] = useState(() =>
    ttlMinutes === undefined ? undefined : Date.now() + ttlMinutes * 60_000,
  );
  return (
    <ApprovalCard
      approval={
        decisions ? { ...sample, state: "resolved", decisions } : sample
      }
      enabled
      pending={false}
      riskOf={toolRisk}
      expiresAt={expiresAt}
      onRespond={setDecisions}
    />
  );
}
export const SingleApprovalPreview = () => (
  <ApprovalPreview sample={singleApproval} ttlMinutes={12} />
);
export const BatchApprovalPreview = () => (
  <ApprovalPreview sample={batchApproval} ttlMinutes={2} />
);

export function InterruptPreview({ sample }: { sample: RenderApproval }) {
  const [answer, setAnswer] = useState<JsonValue | undefined>();
  return (
    <div className="flex w-full flex-col gap-2">
      <InterruptCard
        approval={
          answer === undefined
            ? sample
            : { ...sample, state: "resolved", decisions: [answer] }
        }
        enabled
        pending={false}
        onAnswer={sample.responseSchema === undefined ? undefined : setAnswer}
      />
      {answer !== undefined && (
        <p role="status" className="gallery-feedback">
          Sent {JSON.stringify(answer)}
        </p>
      )}
    </div>
  );
}

export function SuggestionsPreview() {
  const [selected, setSelected] = useState("");
  return (
    <div>
      <Suggestions suggestions={suggestions} onSubmit={setSelected} />
      {selected && (
        <p role="status" className="gallery-feedback">
          {selected}
        </p>
      )}
    </div>
  );
}

function useSampleThreads() {
  const [items, setItems] = useState(threads);
  const [selected, setSelected] = useState(threads[0]!.id);
  return {
    items,
    selected,
    onSelect: setSelected,
    onNew() {
      const thread = { id: crypto.randomUUID(), title: "New chat" };
      setItems((current) => [thread, ...current]);
      setSelected(thread.id);
    },
  };
}

export function SidebarPreview() {
  const sample = useSampleThreads();
  return (
    <ThreadSidebar
      threads={sample.items}
      selectedId={sample.selected}
      onSelect={sample.onSelect}
      onNew={sample.onNew}
      footer="Sample conversations"
    />
  );
}

export function WorkspacePreview() {
  const sample = useSampleThreads();
  return (
    <ChatWorkspace
      title={
        sample.items.find((thread) => thread.id === sample.selected)!.title
      }
      sidebar={
        <ThreadSidebar
          threads={sample.items}
          selectedId={sample.selected}
          onSelect={sample.onSelect}
          onNew={sample.onNew}
          footer="Sample conversations"
        />
      }
    >
      <ChatPreview />
    </ChatWorkspace>
  );
}

export function ScrollButtonPreview() {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div className="relative h-16 w-full">
      <ScrollToLatest onClick={() => setScrolled(true)} visible />
      <span role="status" className="sr-only">
        {scrolled ? "Scrolled to the latest message" : ""}
      </span>
    </div>
  );
}
