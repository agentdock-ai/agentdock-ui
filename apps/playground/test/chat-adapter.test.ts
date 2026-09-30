import { describe, expect, it, vi } from "vitest";
import { createPlaygroundChatAdapter } from "../src/adapter/create-playground-chat-adapter.js";
import { scenarios } from "../../../scripts/fixtures/events.js";

const response = () =>
  new Response(
    scenarios.conversation
      .map(
        (event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      )
      .join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

describe("app-owned playground adapter", () => {
  it("owns request identity and returns canonical events", async () => {
    const request = vi.fn<typeof fetch>(async () => response());
    const adapter = createPlaygroundChatAdapter({
      threadId: "app-thread",
      request: request as typeof fetch,
    });
    const signal = new AbortController().signal;
    const events = [];
    for await (const event of adapter.sendMessage({ text: "Hello", signal }))
      events.push(event);
    expect(events).toEqual(scenarios.conversation);
    expect(request).toHaveBeenCalledWith(
      "/api/agent/stream",
      expect.objectContaining({
        credentials: "same-origin",
        signal,
        body: JSON.stringify({ prompt: "Hello", threadId: "app-thread" }),
      }),
    );
  });
  it("passes opaque resume decisions and canonical run identity unchanged", async () => {
    const request = vi.fn<typeof fetch>(async () => response());
    const adapter = createPlaygroundChatAdapter({
      threadId: "app-thread",
      request: request as typeof fetch,
    });
    const decisions = [{ opaque: { choice: 42 } }];
    for await (const _ of adapter.respondToInterrupt!({
      runId: "run",
      interruptId: "interrupt",
      decisions,
      signal: new AbortController().signal,
    })) {
      /* consume */
    }
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({
      runId: "run",
      interruptId: "interrupt",
      decisions,
      threadId: "app-thread",
    });
  });
  it("confirms cancellation through the app endpoint and hides raw failures", async () => {
    const request = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 409 }),
    );
    const adapter = createPlaygroundChatAdapter({
      threadId: "app-thread",
      request: request as typeof fetch,
    });
    await expect(
      adapter.cancelRun!({
        runId: "run",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Cancellation could not be confirmed.");
    expect(request).toHaveBeenCalledWith(
      "/api/agent/cancel",
      expect.objectContaining({
        body: JSON.stringify({ threadId: "app-thread", runId: "run" }),
      }),
    );
  });
});
