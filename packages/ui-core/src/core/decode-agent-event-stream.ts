import { cloneAgentEvent, type AgentEvent } from "@agentdock-ai/contracts";

export interface DecodeAgentEventStreamOptions {
  signal?: AbortSignal;
}

/** Decode the current canonical AgentDock events from SSE data frames. */
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
        let lineEnd = buffer.search(/[\r\n]/g);
        while (lineEnd !== -1 && !stopped && !options.signal?.aborted) {
          // A trailing CR may be the first half of a CRLF split between chunks.
          if (buffer[lineEnd] === "\r" && lineEnd === buffer.length - 1) break;
          const width =
            buffer[lineEnd] === "\r" && buffer[lineEnd + 1] === "\n" ? 2 : 1;
          const line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + width);
          if (!line) {
            if (dataLines.length > 0)
              yield parseEventLine(dataLines.join("\n"));
            dataLines = [];
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
          } else if (line.trimStart().startsWith("{")) {
            throw new Error("Agent streams must use SSE data frames.");
          }
          lineEnd = buffer.search(/[\r\n]/g);
        }
      }
      buffer += decoder.decode();
      const finalLine = buffer.replace(/\r$/, "");
      if (finalLine.startsWith("data:")) {
        dataLines.push(finalLine.slice(5).replace(/^ /, ""));
      } else if (
        finalLine.trimStart().startsWith("{") &&
        !stopped &&
        !options.signal?.aborted
      ) {
        throw new Error("Agent streams must use SSE data frames.");
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
  return cloneAgentEvent(parsed);
}
