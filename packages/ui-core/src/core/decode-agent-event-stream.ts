import { cloneAgentEvent, type AgentEvent } from "@agentdock-ai/contracts";

export interface DecodeAgentEventStreamOptions {
  signal?: AbortSignal;
}

/** Decode newline-delimited AgentDock events from an HTTP response body. */
export async function* decodeAgentEventStream(
  body: ReadableStream<Uint8Array>,
  options: DecodeAgentEventStreamOptions = {},
): AsyncIterable<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!options.signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lineEnd = buffer.indexOf("\n");
      while (lineEnd !== -1) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "").trim();
        buffer = buffer.slice(lineEnd + 1);
        if (line) yield parseEventLine(line);
        lineEnd = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const finalLine = buffer.trim();
    if (finalLine && !options.signal?.aborted) yield parseEventLine(finalLine);
  } finally {
    if (options.signal?.aborted) await reader.cancel(options.signal.reason);
    reader.releaseLock();
  }
}

function parseEventLine(line: string): AgentEvent {
  const parsed: unknown = JSON.parse(line);
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "type" in parsed &&
    parsed.type === "agentdock.transport.error"
  ) {
    const message = "message" in parsed ? parsed.message : "Agent stream failed.";
    throw new Error(typeof message === "string" ? message : "Agent stream failed.");
  }
  return cloneAgentEvent(parsed);
}
