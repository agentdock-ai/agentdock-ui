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
    const bytes = new TextEncoder().encode(
      `data: ${JSON.stringify(value)}\n\n`,
    );
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
      `data: ${JSON.stringify(event)}\n\ndata: ${JSON.stringify(event)}\n\n`,
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
                ? "data: invalid-json\n\n"
                : `data: ${JSON.stringify(event)}\n\ndata: ${JSON.stringify(terminal)}\n\n`,
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
        controller.enqueue(new TextEncoder().encode("data: invalid\n\n"));
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
  it("rejects unframed JSON instead of accepting another transport format", async () => {
    const iterator = decodeAgentEventStream(
      readable([JSON.stringify(event) + "\n"]),
    )[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow(
      "Agent streams must use SSE data frames.",
    );
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

  it("rejects obsolete transport error objects", async () => {
    const body = readable([
      `data: ${JSON.stringify({ type: "agentdock.transport.error", message: "OpenRouter request failed." })}\n\n`,
    ]);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) {
        /* consume */
      }
    }).rejects.toThrow("Unsupported Agent event protocol version: undefined.");
  });

  it("rejects malformed event frames at the decoder boundary", async () => {
    const body = readable([
      'data: {"type":"message.started","messageId":"missing-envelope"}\n\n',
    ]);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) {
        /* validate */
      }
    }).rejects.toThrow("Unsupported Agent event protocol version: undefined.");
  });
});

it.each(["\n", "\r\n", "\r"])(
  "handles SSE line endings %j across every byte boundary",
  async (ending) => {
    const bytes = new TextEncoder().encode(
      `event: run.started${ending}data: ${JSON.stringify(event)}${ending}${ending}`,
    );
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });
    const values = [];
    for await (const value of decodeAgentEventStream(body)) values.push(value);
    expect(values).toEqual([event]);
  },
);
it("decodes canonical run failures without a second transport error protocol", async () => {
  const failure = {
    ...event,
    type: "run.failed",
    code: "FAILURE",
    message: "Agent failed",
  };
  const values = [];
  for await (const value of decodeAgentEventStream(
    readable([`data: ${JSON.stringify(failure)}\n\n`]),
  ))
    values.push(value);
  expect(values).toEqual([failure]);
});
it("releases a pending read when the iterator is explicitly thrown into", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });
  const iterator = decodeAgentEventStream(body)[Symbol.asyncIterator]();
  const pending = iterator.next();
  const failed = iterator.throw?.(new Error("Stop"));
  await expect(pending).resolves.toMatchObject({ done: true });
  await expect(failed).rejects.toThrow("Stop");
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(body.locked).toBe(false);
});
it("decodes an EOF data field and rejects unframed EOF JSON", async () => {
  const values = [];
  for await (const value of decodeAgentEventStream(
    readable([`data: ${JSON.stringify(event)}`]),
  ))
    values.push(value);
  expect(values).toEqual([event]);
  await expect(
    decodeAgentEventStream(readable([JSON.stringify(event)]))
      [Symbol.asyncIterator]()
      .next(),
  ).rejects.toThrow("SSE data frames");
});
