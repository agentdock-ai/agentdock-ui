import { AGENT_EVENT_PROTOCOL_VERSION } from "@agentdock-ai/contracts";
import { describe, expect, it, vi } from "vitest";
import { decodeAgentEventStream } from "../src/core/decode-agent-event-stream.js";
import type { AgentEvent } from "@agentdock-ai/contracts";
import { AgentStore } from "../src/core/agent-store.js";
import { consumeAgentStream } from "../src/core/consume-agent-stream.js";

const event: AgentEvent = {
  protocolVersion: AGENT_EVENT_PROTOCOL_VERSION,
  eventId: "event-1",
  runId: "run-1",
  logicalSequence: 1,
  phaseId: "phase-1",
  sequence: 1,
  timestamp: "2026-09-14T00:00:00.000Z",
  type: "run.started",
};

function readable(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("decodeAgentEventStream", () => {
  it("cancels a body when consumption is aborted before the first read", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const abort = new AbortController();
    abort.abort();
    const store = new AgentStore();
    await consumeAgentStream(store, decodeAgentEventStream(body), {
      signal: abort.signal,
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
    expect(store.getSnapshot().streamStatus).toBe("stopped");
  });
  it("releases a quiet body even when transport cancellation never settles", async () => {
    const body = new ReadableStream<Uint8Array>({
      cancel: () => new Promise(() => {}),
    });
    const iterator = decodeAgentEventStream(body)[Symbol.asyncIterator]();
    const pending = iterator.next();
    const closing = iterator.return?.();
    await expect(pending).resolves.toMatchObject({ done: true });
    await closing;
    expect(body.locked).toBe(false);
  });
  it("cancels an outstanding read through iterator.return without a decoder signal", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const abort = new AbortController();
    const store = new AgentStore();
    const pending = consumeAgentStream(store, decodeAgentEventStream(body), {
      signal: abort.signal,
    });
    abort.abort();
    await pending;
    await vi.waitFor(() => expect(body.locked).toBe(false));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("preserves Unicode split at every byte and multiline SSE JSON", async () => {
    const value = {
      ...event,
      type: "message.part.delta",
      messageId: "answer",
      part: { type: "text", text: "你好 👋 café" },
    };
    const bytes = new TextEncoder().encode(JSON.stringify(value) + "\n");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });
    const decoded = [];
    for await (const item of decodeAgentEventStream(body)) decoded.push(item);
    expect(decoded).toEqual([value]);
    const frame = JSON.stringify(value, null, 2)
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n");
    const multiline = [];
    for await (const item of decodeAgentEventStream(
      readable([`: keepalive\nevent: message.part.delta\n${frame}\n\n`]),
    ))
      multiline.push(item);
    expect(multiline).toEqual([value]);
  });
  it.each([false, true])(
    "cancels a quiet stream (already aborted: %s)",
    async (alreadyAborted) => {
      const abort = new AbortController();
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({ cancel });
      if (alreadyAborted) abort.abort();
      const iterator = decodeAgentEventStream(body, { signal: abort.signal })[
        Symbol.asyncIterator
      ]();
      const pending = iterator.next();
      abort.abort();
      await expect(pending).resolves.toMatchObject({ done: true });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(body.locked).toBe(false);
    },
  );
  it("does not yield buffered events after abort", async () => {
    const abort = new AbortController();
    const body = readable([
      JSON.stringify(event) + "\n" + JSON.stringify(event) + "\n",
    ]);
    const iterator = decodeAgentEventStream(body, { signal: abort.signal })[
      Symbol.asyncIterator
    ]();
    expect((await iterator.next()).value).toEqual(event);
    abort.abort();
    expect((await iterator.next()).done).toBe(true);
    expect(body.locked).toBe(false);
  });
  it.each(["return", "invalid", "terminal"])(
    "cancels an open body on %s",
    async (mode) => {
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const terminal = {
            ...event,
            eventId: "terminal",
            logicalSequence: 2,
            sequence: 2,
            type: "run.completed",
            finishReason: "stop",
            content: [],
          };
          controller.enqueue(
            new TextEncoder().encode(
              mode === "invalid"
                ? "invalid-json\n"
                : `${JSON.stringify(event)}\n${JSON.stringify(terminal)}\n`,
            ),
          );
        },
        cancel,
      });
      const iterator = decodeAgentEventStream(body)[Symbol.asyncIterator]();
      if (mode === "return") {
        await iterator.next();
        await iterator.return?.();
      } else if (mode === "invalid")
        await expect(iterator.next()).rejects.toThrow();
      else
        await consumeAgentStream(new AgentStore(), {
          [Symbol.asyncIterator]: () => iterator,
        });
      await vi.waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
      expect(body.locked).toBe(false);
    },
  );
  it("preserves the parse error when cleanup rejects", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("invalid\n"));
      },
      cancel() {
        return Promise.reject(new Error("cleanup failed"));
      },
    });
    await expect(
      decodeAgentEventStream(body)[Symbol.asyncIterator]().next(),
    ).rejects.toThrow(SyntaxError);
    expect(body.locked).toBe(false);
  });
  it("decodes NDJSON events across chunk boundaries and CRLF lines", async () => {
    const serialized = JSON.stringify(event);
    const decoded = [];
    for await (const value of decodeAgentEventStream(
      readable([
        `${serialized.slice(0, 13)}`,
        `${serialized.slice(13)}\r\n${serialized}`,
      ]),
    ))
      decoded.push(value);

    expect(decoded).toEqual([event, event]);
  });

  it("decodes SSE data frames across chunk boundaries", async () => {
    const serialized = JSON.stringify(event);
    const decoded = [];
    for await (const value of decodeAgentEventStream(
      readable([
        `: keepalive\r\ndata: ${serialized.slice(0, 17)}`,
        `${serialized.slice(17)}\r\n\r\ndata: ${serialized}\n\n`,
      ]),
    ))
      decoded.push(value);

    expect(decoded).toEqual([event, event]);
  });

  it("turns transport error frames into readable stream errors", async () => {
    const body = readable([
      `${JSON.stringify({ type: "agentdock.transport.error", message: "OpenRouter request failed." })}\n`,
    ]);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) {
        /* consume */
      }
    }).rejects.toThrow("OpenRouter request failed.");
  });

  it("rejects malformed event frames at the decoder boundary", async () => {
    const body = readable([
      '{"type":"message.started","messageId":"missing-envelope"}\n',
    ]);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) {
        /* validate */
      }
    }).rejects.toThrow("Unsupported Agent event protocol version: undefined.");
  });
});
