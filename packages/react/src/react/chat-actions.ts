import {
  consumeAgentStream,
  type AgentStore,
  type JsonValue,
} from "@agentdock-ai/ui-core";
import type {
  AgentEventStream,
  ChatAdapter,
  ChatAttachment,
} from "./chat-adapter.js";

export interface ChatActionState {
  busy: boolean;
  cancelling: boolean;
  respondingTo: string | null;
  actionError: {
    scope: "cancel" | "approval" | "continue";
    message: string;
  } | null;
}
export const idleChatActions: ChatActionState = {
  busy: false,
  cancelling: false,
  respondingTo: null,
  actionError: null,
};

/** UI-local operation lifetime; canonical run state remains exclusively in AgentStore. */
export function createChatActions(
  store: AgentStore,
  adapter: ChatAdapter,
  changed: (state: ChatActionState) => void,
) {
  let state = idleChatActions;
  let active: AbortController | null = null;
  let cancelRequest: AbortController | null = null;
  let disposed = false;
  const update = (patch: Partial<ChatActionState>) => {
    state = { ...state, ...patch };
    if (!disposed) changed(state);
  };
  async function consume(
    source: (signal: AbortSignal) => AgentEventStream,
    interruptId?: string,
    continuation = false,
  ): Promise<boolean> {
    if (active || disposed) return false;
    const controller = new AbortController();
    active = controller;
    update({
      busy: true,
      respondingTo: interruptId ?? null,
      actionError: null,
    });
    try {
      await consumeAgentStream(store, source(controller.signal), {
        signal: controller.signal,
      });
      return (
        !disposed &&
        !controller.signal.aborted &&
        store.getSnapshot().streamStatus !== "error"
      );
    } catch (error) {
      if (disposed || controller.signal.aborted) return false;
      store.setStreamStatus("error", error);
      if (interruptId)
        update({
          actionError: {
            scope: "approval",
            message: store
              .getSnapshot()
              .agent.interrupts.some(
                (interrupt) => interrupt.interruptId === interruptId,
              )
              ? "The response could not be confirmed. Your decision is still pending."
              : "Your response was received, but the connection ended before the agent finished.",
          },
        });
      else if (continuation)
        update({
          actionError: {
            scope: "continue",
            message:
              "The continuation could not be confirmed. Try again when the connection is available.",
          },
        });
      return false;
    } finally {
      active = null;
      update({ busy: false, respondingTo: null });
    }
  }
  return {
    async sendMessage(
      text: string,
      attachments: readonly ChatAttachment[] = [],
    ) {
      const value = text.trim();
      if (
        (!value && attachments.length === 0) ||
        (attachments.length > 0 && !adapter.attachments) ||
        active ||
        disposed ||
        (store.getSnapshot().agent.status === "waiting" &&
          store.getSnapshot().streamStatus !== "stopped")
      )
        return false;
      store.appendUserMessage(
        value,
        attachments.map((item) => item.content),
      );
      return consume((signal) =>
        adapter.sendMessage({
          text: value,
          ...(attachments.length ? { attachments } : {}),
          signal,
        }),
      );
    },
    async respondToInterrupt(
      interruptId: string,
      decisions: readonly JsonValue[],
    ) {
      const { agent, streamStatus } = store.getSnapshot();
      const respond = adapter.respondToInterrupt;
      if (
        !respond ||
        streamStatus === "stopped" ||
        !agent.interrupts.some(
          (interrupt) => interrupt.interruptId === interruptId,
        ) ||
        active ||
        disposed
      )
        return false;
      const runId = agent.runId;
      return consume(
        (signal) =>
          respond.call(adapter, {
            runId,
            interruptId,
            decisions,
            signal,
          }),
        interruptId,
      );
    },
    async continueRun() {
      const { agent, streamStatus } = store.getSnapshot();
      const resume = adapter.continueRun;
      const runId = agent.runId;
      if (
        !resume ||
        agent.status !== "waiting" ||
        agent.interrupts.length > 0 ||
        streamStatus === "stopped" ||
        active ||
        disposed
      )
        return false;
      return consume(
        (signal) => resume.call(adapter, { runId, signal }),
        undefined,
        true,
      );
    },
    async cancelRun() {
      const { agent } = store.getSnapshot();
      if (
        !adapter.cancelRun ||
        !agent.runId ||
        state.cancelling ||
        disposed ||
        (agent.status !== "running" && agent.status !== "waiting")
      )
        return false;
      const runId = agent.runId;
      cancelRequest = new AbortController();
      update({ cancelling: true, actionError: null });
      try {
        await adapter.cancelRun({ runId, signal: cancelRequest.signal });
        if (disposed || store.getSnapshot().agent.runId !== runId) return false;
        // A terminal event may already have arrived. Otherwise stop locally and label it truthfully.
        if (
          store.getSnapshot().agent.status === "running" ||
          (store.getSnapshot().agent.status === "waiting" &&
            store.getSnapshot().streamStatus !== "stopped")
        ) {
          active?.abort();
          store.setStreamStatus("stopped");
        }
        if (
          !active &&
          ["completed", "failed", "cancelled"].includes(
            store.getSnapshot().agent.status,
          )
        )
          store.setStreamStatus("closed");
        return true;
      } catch {
        update({
          actionError: {
            scope: "cancel",
            message: "The run could not be stopped. It may still be running.",
          },
        });
        return false;
      } finally {
        cancelRequest = null;
        update({ cancelling: false });
      }
    },
    dispose() {
      disposed = true;
      active?.abort();
      cancelRequest?.abort();
    },
  };
}
