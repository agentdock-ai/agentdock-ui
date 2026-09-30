import type { RenderMessageItem } from "@agentdock-ai/ui-core";
import { MessageContent } from "./message-content";
import { ChatActionBar } from "./chat-action-bar";
import { ToolMessage } from "./tool-message";
export function Message({
  message,
  showReasoning,
  showActions = true,
}: {
  message: RenderMessageItem;
  showReasoning: boolean;
  showActions?: boolean;
}) {
  if (message.role === "tool") return <ToolMessage message={message} />;
  const user = message.role === "user";
  const blocks = showReasoning
    ? message.blocks
    : message.blocks.filter((b) => b.type !== "reasoning");
  if (!blocks.length) return null;
  const answer = blocks
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n\n");
  return (
    <article
      data-role={message.role}
      data-message-id={message.id}
      aria-label={user ? "You" : "Assistant"}
      className={
        user
          ? "ml-auto min-w-0 max-w-[90%] rounded-2xl bg-muted px-4 py-2 sm:max-w-[85%]"
          : "group/message min-w-0 w-full px-2"
      }
    >
      {user ? (
        <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-[14px] leading-6 [overflow-wrap:anywhere]">
          {blocks.map((block) =>
            block.type === "text" ? (
              <span key={block.id}>{block.text}</span>
            ) : (
              <MessageContent
                key={block.id}
                blocks={[block]}
                showReasoning={showReasoning}
              />
            ),
          )}
        </div>
      ) : (
        <MessageContent blocks={blocks} showReasoning={showReasoning} />
      )}
      {!user && showActions && message.state !== "streaming" && answer && (
        <ChatActionBar text={answer} />
      )}
    </article>
  );
}
