import { describe, expect, it, vi } from "vitest";
import { createConversationClient } from "../src/react/conversation-client.js";

const thread = {
  id: "thread-1",
  title: "New conversation",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const history = {
  protocolVersion: 1,
  thread,
  messages: [],
  nextCursor: null,
  snapshotId: "snapshot",
  execution: {
    operationId: "pending",
    runId: null,
    status: "paused",
    action: "start",
  },
  nativeControls: { pendingNodes: ["model_request"], interrupts: [] },
  interrupts: [],
  actions: {
    canStart: true,
    canStop: false,
    canContinue: true,
    canRespondToInterrupt: false,
  },
};

describe("conversation client", () => {
  it("validates catalog and history requests, sends native actions, and scopes the pending thread", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const settled = vi.fn();
    const threadsChanged = vi.fn();
    const client = createConversationClient({
      getThreadId: () => thread.id,
      onOperationSettled: settled,
      onThreadsChanged: threadsChanged,
      async fetcher(input, init) {
        const url = String(input);
        calls.push({ url, init });
        if (
          url.includes("/conversations?") ||
          (url.endsWith("/conversations") &&
            (!init?.method || init.method === "GET"))
        )
          return Response.json({
            protocolVersion: 1,
            threads: [thread],
            nextCursor: "next",
          });
        if (url.endsWith("/conversations") && init?.method === "POST")
          return Response.json({ protocolVersion: 1, thread }, { status: 201 });
        if (url.endsWith(`/${thread.id}`) && init?.method === "PATCH")
          return Response.json({
            protocolVersion: 1,
            thread: { ...thread, title: "Renamed" },
          });
        if (url.includes("/history")) return Response.json(history);
        if (url.includes("/attachments") && init?.method === "POST")
          return Response.json(
            {
              protocolVersion: 1,
              id: "file-1",
              threadId: thread.id,
              name: "image.png",
              mimeType: "image/png",
              size: 4,
              url: "/saved.png",
              createdAt: "2026-01-01T00:00:00.000Z",
              content: { type: "image", url: "/saved.png" },
            },
            { status: 201 },
          );
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            operationId: string;
            threadId: string;
          };
          const envelope = {
            protocolVersion: 1,
            operationId: body.operationId,
            threadId: body.threadId,
            event: {
              protocolVersion: 3,
              eventId: "event-1",
              runId: "run-1",
              phaseId: "phase-1",
              sequence: 1,
              logicalSequence: 1,
              timestamp: "2026-01-01T00:00:00.000Z",
              type: "run.started",
            },
          };
          return new Response(`data: ${JSON.stringify(envelope)}\n\n`);
        }
        return new Response(
          JSON.stringify({ code: "not_found", message: "Not found." }),
          { status: 404 },
        );
      },
    });

    expect((await client.listThreads()).nextCursor).toBe("next");
    await client.listThreads(undefined, "next");
    expect(threadsChanged).toHaveBeenCalledTimes(2);
    await client.createThread("New conversation");
    await client.createThread();
    expect((await client.renameThread(thread.id, "Renamed")).title).toBe(
      "Renamed",
    );
    expect((await client.getHistory(thread.id)).actions.canContinue).toBe(true);
    await client.getHistory(thread.id, undefined, "position-20");
    const continuation = client.adapter.continueRun!({
      runId: null,
      signal: new AbortController().signal,
    });
    const events = [];
    for await (const event of continuation) events.push(event);
    expect(events[0]?.type).toBe("run.started");
    expect(settled).toHaveBeenCalledWith(thread.id);

    const uploaded = await client.adapter.attachments!.upload({
      file: new File([new Uint8Array([1, 2, 3, 4])], "image.png", {
        type: "image/png",
      }),
      signal: new AbortController().signal,
    });
    expect(uploaded.content.url).toBe("/saved.png");
    expect(calls.some(({ url }) => url.includes("cursor=next"))).toBe(true);
    expect(
      calls.find(({ url }) => url.includes("/continue"))?.init?.body,
    ).toContain('"pendingOperationId":"pending"');
  });

  it("cancels only the active operation on its thread and accepts empty stop responses", async () => {
    let source: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stopBody: Record<string, unknown>[] = [];
    const client = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher(input, init) {
        const url = String(input);
        if (url.includes("/start"))
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                source = controller;
              },
            }),
          );
        if (url.includes("/stop")) {
          stopBody.push(
            JSON.parse(String(init?.body)) as Record<string, unknown>,
          );
          return new Response(null, { status: 204 });
        }
        return Response.json(history);
      },
    });
    const iterator = client.adapter
      .sendMessage({ text: "Run", signal: new AbortController().signal })
      [Symbol.asyncIterator]();
    const next = iterator.next();
    await Promise.resolve();
    await client.adapter.cancelRun!({
      runId: "run-1",
      signal: new AbortController().signal,
    });
    expect(stopBody[0]).toMatchObject({ threadId: thread.id });
    source?.close();
    await expect(next).resolves.toMatchObject({ done: true });
    await iterator.return?.();
  });

  it("rejects a stream envelope from another thread or operation and reports API errors", async () => {
    const client = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher(_input, init) {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { operationId: string };
          return new Response(
            `data: ${JSON.stringify({
              protocolVersion: 1,
              operationId: body.operationId,
              threadId: "other-thread",
              event: {
                protocolVersion: 3,
                eventId: "event",
                runId: "run",
                phaseId: "phase",
                sequence: 1,
                logicalSequence: 1,
                timestamp: "2026-01-01T00:00:00.000Z",
                type: "run.started",
              },
            })}\n\n`,
          );
        }
        return Response.json({ message: "Not found." }, { status: 404 });
      },
    });
    const stream = client.adapter.sendMessage({
      text: "Hello",
      signal: new AbortController().signal,
    });
    await expect(
      (async () => {
        for await (const _event of stream) {
          /* consume */
        }
      })(),
    ).rejects.toThrow("identity");
    await expect(client.renameThread(thread.id, "Rename")).rejects.toThrow(
      "Not found.",
    );
  });

  it("handles a successful response with no event body and requires a selected thread", async () => {
    const client = createConversationClient({
      getThreadId: () => null,
      async fetcher() {
        return new Response(null, { status: 200 });
      },
    });
    expect(() =>
      client.adapter.sendMessage({
        text: "No thread",
        signal: new AbortController().signal,
      }),
    ).toThrow("Select a conversation");
    const noBody = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher() {
        return new Response(null, { status: 200 });
      },
    });
    await expect(
      (async () => {
        for await (const _event of noBody.adapter.sendMessage({
          text: "No body",
          signal: new AbortController().signal,
        })) {
          /* consume */
        }
      })(),
    ).rejects.toThrow("The conversation request failed.");
  });

  it("uploads only same-thread validated attachments and reports upload failures", async () => {
    const attachment = {
      protocolVersion: 1,
      id: "file-1",
      threadId: thread.id,
      name: "image.png",
      mimeType: "image/png",
      size: 4,
      url: "/saved.png",
      createdAt: "2026-01-01T00:00:00.000Z",
      content: { type: "image", url: "/saved.png" },
    };
    let response: Response = Response.json(attachment, { status: 201 });
    const client = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher() {
        return response;
      },
    });
    const file = new File([new Uint8Array([1])], "image.png", {
      type: "image/png",
    });
    await expect(
      client.adapter.attachments!.upload({
        file,
        signal: new AbortController().signal,
      }),
    ).resolves.toMatchObject({ id: "file-1" });

    response = Response.json({ ...attachment, threadId: "other" });
    await expect(
      client.adapter.attachments!.upload({
        file,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("another conversation");
    response = new Response(null, { status: 500 });
    await expect(
      client.adapter.attachments!.upload({
        file,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("image upload failed");
    response = new Response(
      JSON.stringify({ message: "Storage unavailable" }),
      { status: 503 },
    );
    await expect(
      client.adapter.attachments!.upload({
        file,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Storage unavailable");
  });

  it("routes native approvals, clears settled pending work, and rejects continue without native state", async () => {
    const calls: string[] = [];
    const settled = vi.fn();
    const client = createConversationClient({
      getThreadId: () => thread.id,
      onOperationSettled: settled,
      async fetcher(input, init) {
        const url = String(input);
        calls.push(url);
        if (url.includes("/history"))
          return Response.json({
            ...history,
            execution: null,
            actions: { ...history.actions, canContinue: false },
          });
        if (url.includes("/approvals")) {
          const body = JSON.parse(String(init?.body)) as {
            operationId: string;
          };
          return new Response(
            `data: ${JSON.stringify({ protocolVersion: 1, operationId: body.operationId, threadId: thread.id, event: { protocolVersion: 3, eventId: "done", runId: "run", phaseId: "phase", sequence: 1, logicalSequence: 1, timestamp: "2026-01-01T00:00:00.000Z", type: "run.completed", finishReason: "stop", content: [] } })}\n\n`,
          );
        }
        return new Response(JSON.stringify({ message: "Unavailable" }), {
          status: 503,
        });
      },
    });
    await client.getHistory(thread.id);
    expect(() =>
      client.adapter.continueRun!({
        runId: null,
        signal: new AbortController().signal,
      }),
    ).toThrow("No native pending");
    const approved = client.adapter.respondToInterrupt!({
      runId: null,
      interruptId: "interrupt-1",
      decisions: [{ type: "approve" }],
      signal: new AbortController().signal,
    });
    for await (const event of approved)
      expect(event.type).toBe("run.completed");
    expect(calls.some((url) => url.includes("/approvals"))).toBe(true);
    expect(settled).toHaveBeenCalledWith(thread.id);
  });

  it("cleans active state after fetch rejection and parses request errors without JSON", async () => {
    const settled = vi.fn();
    const client = createConversationClient({
      baseUrl: "/api/",
      getThreadId: () => thread.id,
      onOperationSettled: settled,
      async fetcher(input) {
        if (String(input).includes("/start"))
          throw new Error("Network disconnected");
        return new Response(null, { status: 502 });
      },
    });
    await expect(
      (async () => {
        for await (const _event of client.adapter.sendMessage({
          text: "Hi",
          signal: new AbortController().signal,
        })) {
          /* consume */
        }
      })(),
    ).rejects.toThrow("Network disconnected");
    expect(settled).toHaveBeenCalledWith(thread.id);
    await expect(client.listThreads()).rejects.toThrow(
      "Conversation request failed (502)",
    );
  });

  it("rejects cancellation when no operation is active and drops pending state after terminal events", async () => {
    const done = {
      protocolVersion: 3,
      eventId: "done",
      runId: "run",
      phaseId: "phase",
      sequence: 2,
      logicalSequence: 2,
      timestamp: "2026-01-01T00:00:00.000Z",
      type: "run.completed",
      finishReason: "stop",
      content: [],
    };
    const client = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher(_input, init) {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { operationId: string };
          return new Response(
            `data: ${JSON.stringify({ protocolVersion: 1, operationId: body.operationId, threadId: thread.id, event: done })}\n\n`,
          );
        }
        return Response.json(history);
      },
    });
    await expect(
      client.adapter.cancelRun!({
        runId: "run",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("no active");
    for await (const _event of client.adapter.sendMessage({
      text: "Hi",
      signal: new AbortController().signal,
    })) {
      /* consume */
    }
    expect(() =>
      client.adapter.continueRun!({
        runId: null,
        signal: new AbortController().signal,
      }),
    ).toThrow("No native pending");
  });

  it("covers native approval continuation controls, server stream errors, and abort-aware parsing", async () => {
    const controller = new AbortController();
    const streamClient = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher(input) {
        const url = String(input);
        if (url.includes("/history"))
          return Response.json({
            ...history,
            actions: {
              canStart: true,
              canStop: false,
              canContinue: false,
              canRespondToInterrupt: true,
            },
          });
        if (url.includes("/continue"))
          return new Response(
            JSON.stringify({ message: "Pending work expired" }),
            { status: 409 },
          );
        if (url.includes("/approvals"))
          return new Response(JSON.stringify({ message: "Approval expired" }), {
            status: 409,
          });
        const body = new ReadableStream<Uint8Array>({
          start(target) {
            target.enqueue(new TextEncoder().encode("\n\n"));
            controller.abort();
            target.close();
          },
        });
        return new Response(body);
      },
    });
    await streamClient.getHistory(thread.id);
    await expect(
      (async () => {
        for await (const _event of streamClient.adapter.continueRun!({
          runId: null,
          signal: new AbortController().signal,
        })) {
          /* consume */
        }
      })(),
    ).rejects.toThrow("Pending work expired");
    await expect(
      (async () => {
        for await (const _event of streamClient.adapter.respondToInterrupt!({
          runId: null,
          interruptId: "i",
          decisions: [],
          signal: new AbortController().signal,
        })) {
          /* consume */
        }
      })(),
    ).rejects.toThrow("Approval expired");

    const parserClient = createConversationClient({
      getThreadId: () => thread.id,
      async fetcher() {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(target) {
              target.enqueue(new TextEncoder().encode("\n\n"));
              controller.abort();
              target.close();
            },
          }),
        );
      },
    });
    const parser = parserClient.adapter.sendMessage({
      text: "Stop parsing",
      signal: controller.signal,
    });
    for await (const _event of parser) {
      /* consume */
    }
  });

  it("uses the ambient fetch implementation when no fetcher override is supplied", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ protocolVersion: 1, threads: [], nextCursor: null }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const client = createConversationClient({ getThreadId: () => null });
      await client.listThreads();
      expect(fetchMock).toHaveBeenCalledWith("/conversations", {
        signal: undefined,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

it("rejects a history response from a different thread", async () => {
  const client = createConversationClient({
    getThreadId: () => thread.id,
    fetcher: async () =>
      Response.json({ ...history, thread: { ...thread, id: "other" } }),
  });
  await expect(client.getHistory(thread.id)).rejects.toThrow(
    "another conversation",
  );
});

it("captures the thread when creating a stream rather than when iteration begins", async () => {
  let selected = "one";
  let captured: string | undefined;
  const client = createConversationClient({
    getThreadId: () => selected,
    fetcher: async (_url, init) => {
      captured = JSON.parse(String(init?.body)).threadId;
      return new Response("");
    },
  });
  const stream = client.adapter.sendMessage({
    text: "Hello",
    signal: new AbortController().signal,
  });
  selected = "two";
  for await (const _event of stream) {
  }
  expect(captured).toBe("one");
});
