import { useEffect, useRef, useState } from "react";
import type { ChatAdapter, ChatAttachment } from "./chat-adapter.js";
import { useAgentStore } from "./agent-provider.js";
import { createChatActions, idleChatActions } from "./chat-actions.js";

/** Keep the adapter stable for an operation. Replacing it aborts the old local stream. */
export function useAgentActions(adapter: ChatAdapter) {
  const store = useAgentStore();
  const [state, setState] = useState(idleChatActions);
  const actions = useRef<ReturnType<typeof createChatActions> | null>(null);
  useEffect(() => {
    const current = createChatActions(store, adapter, setState);
    actions.current = current;
    setState(idleChatActions);
    return () => {
      current.dispose();
      if (actions.current === current) actions.current = null;
    };
  }, [store, adapter]);
  return {
    ...state,
    canCancel: Boolean(adapter.cancelRun),
    canRespond: Boolean(adapter.respondToInterrupt),
    canContinue: Boolean(adapter.continueRun),
    sendMessage: (text: string, attachments?: readonly ChatAttachment[]) =>
      actions.current?.sendMessage(text, attachments) ?? Promise.resolve(false),
    cancelRun: () => actions.current?.cancelRun() ?? Promise.resolve(false),
    continueRun: () => actions.current?.continueRun() ?? Promise.resolve(false),
    respondToInterrupt: (
      interruptId: string,
      decisions: Parameters<
        NonNullable<ChatAdapter["respondToInterrupt"]>
      >[0]["decisions"],
    ) =>
      actions.current?.respondToInterrupt(interruptId, decisions) ??
      Promise.resolve(false),
  };
}
