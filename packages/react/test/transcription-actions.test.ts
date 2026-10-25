import { expect, it } from "vitest";
import { AgentStore } from "@agentdock-ai/ui-core";
import {
  createChatActions,
  type ChatActionState,
} from "../src/react/chat-actions.js";
import type { ChatAdapter } from "../src/react/chat-adapter.js";
const audio = new Blob(["audio"], { type: "audio/webm" });
const sendMessage: ChatAdapter["sendMessage"] = async function* () {};
it("transcribes separately from run actions without sending a message", async () => {
  const store = new AgentStore();
  const states: ChatActionState[] = [];
  const actions = createChatActions(
    store,
    {
      sendMessage,
      async transcribe(input) {
        expect(input.audio).toBe(audio);
        expect(input.mimeType).toBe("audio/webm");
        return { text: "Draft sentence" };
      },
    },
    (s) => states.push(s),
  );
  actions.cancelTranscription();
  expect(await actions.transcribe(audio, "audio/webm")).toBe("Draft sentence");
  expect(states[0].transcribing).toBe(true);
  expect(states.at(-1)?.transcribing).toBe(false);
  expect(store.getSnapshot().agent.messages).toEqual([]);
  const unavailable = createChatActions(store, { sendMessage }, () => {});
  expect(await unavailable.transcribe(audio, "x")).toBeUndefined();
  unavailable.dispose();
});
it("aborts promptly, blocks overlap, and ignores a late or uncooperative provider", async () => {
  for (const dispose of [false, true]) {
    let signal: AbortSignal | undefined;
    let finish: ((value: { text: string }) => void) | undefined;
    const actions = createChatActions(
      new AgentStore(),
      {
        sendMessage,
        transcribe(input) {
          signal = input.signal;
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
      },
      () => {},
    );
    const pending = actions.transcribe(audio, "audio/webm");
    await Promise.resolve();
    expect(await actions.transcribe(audio, "audio/webm")).toBeUndefined();
    if (dispose) actions.dispose();
    else actions.cancelTranscription();
    expect(signal?.aborted).toBe(true);
    expect(await pending).toBeUndefined();
    finish?.({ text: "Late" });
    if (dispose)
      expect(await actions.transcribe(audio, "audio/webm")).toBeUndefined();
  }
});
it("keeps friendly transcription errors and only safe provider codes", async () => {
  for (const error of [
    new Error("secret API key"),
    { code: "transcription_unavailable" },
    { code: "Unsafe API Key" },
    null,
    42,
  ]) {
    let state: ChatActionState | undefined;
    const actions = createChatActions(
      new AgentStore(),
      {
        sendMessage,
        transcribe() {
          throw error;
        },
      },
      (s) => {
        state = s;
      },
    );
    expect(await actions.transcribe(audio, "audio/mp4")).toBeUndefined();
    expect(state?.actionError?.scope).toBe("transcribe");
    expect(state?.actionError?.message).not.toContain("secret");
    expect(state?.actionError?.code).toBe(
      error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "transcription_unavailable"
        ? "transcription_unavailable"
        : undefined,
    );
  }
});
