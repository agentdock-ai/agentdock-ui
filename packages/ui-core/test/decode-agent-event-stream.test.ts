import { describe, expect, it } from "vitest";
import { decodeAgentEventStream } from "../src/core/decode-agent-event-stream.js";
import type { AgentEvent } from "@agentdock-ai/contracts";

const event: AgentEvent = {
  protocolVersion: 1,
  eventId: "event-1",
  runId: "run-1",
  sessionId: "session-1",
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
  it("decodes NDJSON events across chunk boundaries and CRLF lines", async () => {
    const serialized = JSON.stringify(event);
    const decoded = [];
    for await (const value of decodeAgentEventStream(readable([
      `${serialized.slice(0, 13)}`,
      `${serialized.slice(13)}\r\n${serialized}`,
    ]))) decoded.push(value);

    expect(decoded).toEqual([event, event]);
  });

  it("turns transport error frames into readable stream errors", async () => {
    const body = readable([`${JSON.stringify({ type: "agentdock.transport.error", message: "OpenRouter request failed." })}\n`]);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) { /* consume */ }
    }).rejects.toThrow("OpenRouter request failed.");
  });

  it("rejects malformed event frames at the decoder boundary", async () => {
    const body = readable(['{"type":"message.started","messageId":"missing-envelope"}\n']);
    await expect(async () => {
      for await (const _event of decodeAgentEventStream(body)) { /* validate */ }
    }).rejects.toThrow("Unsupported Agent event protocol version: undefined.");
  });
});
