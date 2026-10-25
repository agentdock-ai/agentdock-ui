import { expect, it, vi } from "vitest";
import { AgentStore } from "@agentdock-ai/react";
import { createFixtureChatAdapter } from "../src/adapter/create-fixture-chat-adapter.js";
import { createPlaygroundChatAdapter } from "../src/adapter/create-playground-chat-adapter.js";
it("offers fixture transcription without a speech provider and respects abort", async () => {
  vi.useFakeTimers();
  const adapter = createFixtureChatAdapter(new AgentStore());
  const audio = new Blob(["audio"], { type: "audio/webm" });
  const pending = adapter.transcribe?.({
    audio,
    mimeType: audio.type,
    signal: new AbortController().signal,
  });
  await vi.advanceTimersByTimeAsync(600);
  expect(await pending).toEqual({
    text: "This is a voice draft. Edit it before sending.",
  });
  const controller = new AbortController();
  const aborted = adapter.transcribe?.({
    audio,
    mimeType: audio.type,
    signal: controller.signal,
  });
  const result = expect(aborted).rejects.toHaveProperty("name", "AbortError");
  controller.abort();
  await result;
  vi.useRealTimers();
});
it("posts multipart speech to the live route and preserves safe error codes", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ text: "Live draft" }))
    .mockResolvedValueOnce(
      Response.json(
        {
          code: "transcription_unavailable",
          message: "Configure speech first",
        },
        { status: 501 },
      ),
    )
    .mockResolvedValueOnce(Response.json({ text: 42 }));
  const adapter = createPlaygroundChatAdapter({ threadId: "t", request });
  const signal = new AbortController().signal;
  const input = {
    audio: new Blob(["audio"], { type: "audio/mp4" }),
    mimeType: "audio/mp4",
    signal,
  };
  expect(await adapter.transcribe?.(input)).toEqual({ text: "Live draft" });
  expect(request.mock.calls[0]?.[0]).toBe("/api/transcribe");
  expect(request.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    signal,
    credentials: "same-origin",
  });
  expect(request.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
  await expect(adapter.transcribe?.(input)).rejects.toHaveProperty(
    "code",
    "transcription_unavailable",
  );
  await expect(adapter.transcribe?.(input)).rejects.toThrow(
    "did not contain text",
  );
});
