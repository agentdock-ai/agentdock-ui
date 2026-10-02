import { cloneAgentEvent, type AgentEvent } from "@agentdock-ai/contracts";

export interface DecodeAgentEventStreamOptions {
  signal?: AbortSignal;
}

/** Decode AgentDock SSE frames and legacy newline-delimited event streams. */
export function decodeAgentEventStream(
  body: ReadableStream<Uint8Array>,
  options: DecodeAgentEventStreamOptions = {},
): AsyncIterable<AgentEvent> {
  let stop: (() => void) | undefined;
  let stopped = false;
  const iterator = decode();
  const requestStop = () => {
    if (stopped) return;
    stopped = true;
    if (stop) stop();
    else void body.cancel(options.signal?.reason).catch(() => undefined);
  };
  // AsyncGenerator.return alone cannot wake a pending reader.read.
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => iterator.next(),
        return: () => {
          requestStop();
          return iterator.return(undefined);
        },
        throw: (error: unknown) => {
          requestStop();
          return iterator.throw(error);
        },
      };
    },
  };

  async function* decode(): AsyncGenerator<AgentEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let dataLines: string[] = [];
    let inSseFrame = false;
    let ended = false;
    let cancelled = false;
    const cancel = () => {
      if (cancelled || ended) return;
      cancelled = true;
      // Cancel wakes a pending read; a failing transport cleanup must not mask parsing errors.
      void reader.cancel(options.signal?.reason).catch(() => undefined);
    };
    stop = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    try {
      while (!stopped && !options.signal?.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          ended = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let lineEnd = buffer.indexOf("\n");
        while (lineEnd !== -1 && !stopped && !options.signal?.aborted) {
          const line = buffer.slice(0, lineEnd).replace(/\r$/, "").trim();
          buffer = buffer.slice(lineEnd + 1);
          if (!line) {
            if (dataLines.length > 0)
              yield parseEventLine(dataLines.join("\n"));
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
      } else if (
        finalLine &&
        !inSseFrame &&
        !stopped &&
        !options.signal?.aborted
      ) {
        yield parseEventLine(finalLine);
      }
      if (dataLines.length > 0 && !stopped && !options.signal?.aborted) {
        yield parseEventLine(dataLines.join("\n"));
      }
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      cancel();
      reader.releaseLock();
    }
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
