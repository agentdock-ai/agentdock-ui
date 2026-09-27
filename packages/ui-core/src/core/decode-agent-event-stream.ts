import { cloneAgentEvent, type AgentEvent } from "@agentdock-ai/contracts";

export interface DecodeAgentEventStreamOptions {
  signal?: AbortSignal;
}

/** Decode AgentDock SSE frames and legacy newline-delimited event streams. */
export async function* decodeAgentEventStream(
  body: ReadableStream<Uint8Array>,
  options: DecodeAgentEventStreamOptions = {},
): AsyncIterable<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  let inSseFrame = false;

  try {
    while (!options.signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lineEnd = buffer.indexOf("\n");
      while (lineEnd !== -1) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "").trim();
        buffer = buffer.slice(lineEnd + 1);
        if (!line) {
          if (dataLines.length > 0) yield parseEventLine(dataLines.join("\n"));
          dataLines = [];
          inSseFrame = false;
        } else if (line.startsWith("data:")) {
          inSseFrame = true;
          dataLines.push(line.slice(5).replace(/^ /, ""));
        } else if (line.startsWith(":") || /^(event|id|retry):/.test(line)) {
          inSseFrame = true;
        } else if (!inSseFrame) {
          yield parseEventLine(line);
        }
        lineEnd = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const finalLine = buffer.replace(/\r$/, "").trim();
    if (finalLine.startsWith("data:")) {
      dataLines.push(finalLine.slice(5).replace(/^ /, ""));
    } else if (finalLine && !inSseFrame && !options.signal?.aborted) {
      yield parseEventLine(finalLine);
    }
    if (dataLines.length > 0 && !options.signal?.aborted) {
      yield parseEventLine(dataLines.join("\n"));
    }
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
    const message =
      "message" in parsed ? parsed.message : "Agent stream failed.";
    throw new Error(
      typeof message === "string" ? message : "Agent stream failed.",
    );
  }
  return cloneAgentEvent(parsed);
}
