import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import {
  createAgentReducerState,
  type AgentEvent,
} from "@agentdock-ai/contracts";
import { agentDockPlaygroundPlugin } from "../server/index.js";
import {
  scenarios,
  sequence,
  complete,
} from "../../../scripts/fixtures/events.js";

const runtime = vi.hoisted(() => ({
  stream: vi.fn(),
  getResumeState: vi.fn(),
}));
vi.mock("@agentdock-ai/agentdock", async (original) => ({
  ...(await original<typeof import("@agentdock-ai/agentdock")>()),
  Agentdock: class {
    stream = runtime.stream;
    getResumeState = runtime.getResumeState;
  },
}));

class ResponseFixture extends EventEmitter {
  status = 0;
  headersSent = false;
  destroyed = false;
  writableEnded = false;
  chunks: string[] = [];
  writeHead(status: number) {
    this.status = status;
    this.headersSent = true;
    return this;
  }
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end(chunk?: string) {
    if (chunk) this.chunks.push(chunk);
    this.writableEnded = true;
  }
  json() {
    return JSON.parse(this.chunks.join(""));
  }
}

function server() {
  let middleware!: (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => unknown;
  const plugin = agentDockPlaygroundPlugin({
    apiKey: "test-key",
    model: "test-model",
  });
  const configure = plugin.configureServer as (server: ViteDevServer) => void;
  configure({
    config: { server: { port: 5173 } },
    httpServer: { address: () => ({ port: 5173 }) },
    middlewares: {
      use(handler: typeof middleware) {
        middleware = handler;
      },
    },
  } as unknown as ViteDevServer);
  return async (
    path: string,
    body?: unknown,
    headers: Record<string, string | undefined> = {},
    response = new ResponseFixture(),
  ) => {
    const request = Readable.from(
      body === undefined ? [] : [JSON.stringify(body)],
    ) as unknown as IncomingMessage;
    request.url = path;
    request.method = body === undefined ? "GET" : "POST";
    request.headers = {
      host: "127.0.0.1:5173",
      origin: "http://127.0.0.1:5173",
      "content-type": "application/json",
      ...headers,
    };
    await middleware(request, response as unknown as ServerResponse, () => {});
    return response;
  };
}

async function* events(values: readonly AgentEvent[]) {
  yield* values;
}
function pending() {
  return {
    ...createAgentReducerState(),
    status: "waiting" as const,
    interrupts: [
      scenarios.approval.find((event) => event.type === "interrupt.required")!
        .interrupt,
    ],
    pausedNodes: ["review"],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  runtime.stream.mockImplementation(() => events(scenarios.approval));
  runtime.getResumeState.mockResolvedValue(pending());
});

describe("playground API boundaries", () => {
  it("rejects malformed request targets without throwing from middleware", async () => {
    const response = await server()("http://[invalid");
    expect(response.status).toBe(400);
    expect(runtime.stream).not.toHaveBeenCalled();
  });
  it.each([
    "/api/configure",
    "/api/agent/stream",
    "/api/agent/cancel",
    "/api/attachments?threadId=t",
  ])("rejects foreign-origin mutations at %s", async (path) => {
    const response = await server()(
      path,
      {},
      { origin: "https://unrelated.example" },
    );
    expect(response.status).toBe(403);
    expect(runtime.stream).not.toHaveBeenCalled();
  });
  it.each([
    { origin: undefined },
    { origin: "null" },
    { host: "evil.example:5173" },
    { host: "127.0.0.1:5199" },
    { "sec-fetch-site": "cross-site" },
    { origin: "http://127.0.0.1:5173/forged-path" },
  ])("rejects forged or missing origin/host metadata %j", async (headers) => {
    expect(
      (
        await server()(
          "/api/configure",
          { provider: "ollama", model: "m" },
          headers,
        )
      ).status,
    ).toBe(403);
  });
  it.each(["text/plain", "application/x-www-form-urlencoded", "text/json"])(
    "rejects non-JSON API bodies (%s)",
    async (type) => {
      expect(
        (
          await server()(
            "/api/configure",
            { provider: "ollama", model: "m" },
            { "content-type": type },
          )
        ).status,
      ).toBe(415);
    },
  );
  it.each(["127.0.0.1", "localhost", "[::1]"])(
    "accepts its own %s origin",
    async (host) => {
      expect(
        (
          await server()(
            "/api/configure",
            { provider: "ollama", model: "m" },
            {
              host: `${host}:5173`,
              origin: `http://${host}:5173`,
              "content-type": "application/json; charset=utf-8",
            },
          )
        ).status,
      ).toBe(200);
    },
  );
  it("keeps local read-only health checks available without Origin", async () => {
    expect(
      (await server()("/api/health", undefined, { origin: undefined })).status,
    ).toBe(200);
  });
  it("resumes a valid native checkpoint with no checkpoint wire run ID", async () => {
    const request = server();
    await request("/api/agent/stream", { threadId: "t", prompt: "Start" });
    const decisions = [{ type: "approve" }];
    const response = await request("/api/agent/stream", {
      threadId: "t",
      runId: "fixture-run",
      interruptId: "decision-1",
      decisions,
    });
    expect(response.status).toBe(200);
    expect(runtime.stream.mock.calls[1]?.[0]).toMatchObject({
      threadId: "t",
      resume: { "decision-1": { decisions } },
    });
    expect(response.listenerCount("close")).toBe(0);
  });
  it.each([
    { runId: "stale", interruptId: "decision-1", decisions: [] },
    { runId: "fixture-run", interruptId: "stale", decisions: [] },
    { runId: "fixture-run", interruptId: "decision-1", decisions: {} },
  ])("rejects stale or invalid approval requests %j", async (body) => {
    const request = server();
    await request("/api/agent/stream", { threadId: "t", prompt: "Start" });
    expect(
      (await request("/api/agent/stream", { threadId: "t", ...body })).status,
    ).toBe(409);
    expect(runtime.stream).toHaveBeenCalledTimes(1);
  });
  it("targets custom interrupts with opaque values and rejects another thread’s run ID", async () => {
    runtime.getResumeState.mockResolvedValue({
      ...pending(),
      interrupts: [
        {
          interruptId: "custom",
          kind: "custom",
          prompt: "Choose",
          actions: [],
        },
      ],
    });
    const request = server();
    await request("/api/agent/stream", { threadId: "t", prompt: "Start" });
    const body = {
      runId: "fixture-run",
      interruptId: "custom",
      decisions: [{ opaque: 42 }],
    };
    expect(
      (await request("/api/agent/stream", { threadId: "other", ...body }))
        .status,
    ).toBe(409);
    expect(
      (await request("/api/agent/stream", { threadId: "t", ...body })).status,
    ).toBe(200);
    expect(runtime.stream.mock.calls[1]?.[0]).toMatchObject({
      resume: { custom: [{ opaque: 42 }] },
    });
  });
  it("reserves a thread before asynchronous resume validation", async () => {
    const request = server();
    await request("/api/agent/stream", { threadId: "t", prompt: "Start" });
    let release!: (value: ReturnType<typeof pending>) => void;
    runtime.getResumeState.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const body = {
      threadId: "t",
      runId: "fixture-run",
      interruptId: "decision-1",
      decisions: [],
    };
    const first = request("/api/agent/stream", body);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    expect((await request("/api/agent/stream", body)).status).toBe(409);
    release(pending());
    expect((await first).status).toBe(200);
    expect(runtime.stream).toHaveBeenCalledTimes(2);
  });
  it("continues static pauses and rejects continuation with pending approvals", async () => {
    const request = server();
    await request("/api/agent/stream", { threadId: "t", prompt: "Start" });
    const body = { threadId: "t", runId: "fixture-run", continue: true };
    expect((await request("/api/agent/stream", body)).status).toBe(409);
    runtime.getResumeState.mockResolvedValue({
      ...pending(),
      interrupts: [],
      interrupt: null,
    });
    expect((await request("/api/agent/stream", body)).status).toBe(200);
    expect(runtime.stream.mock.calls[1]?.[0]).toMatchObject({
      continue: true,
      threadId: "t",
    });
  });
  it("releases the thread and response listeners after stream failure", async () => {
    runtime.stream.mockImplementation(async function* () {
      throw new Error("secret API key");
    });
    const request = server();
    const response = await request("/api/agent/stream", {
      threadId: "t",
      prompt: "Start",
    });
    expect(response.status).toBe(400);
    expect(response.chunks.join("")).not.toContain("secret");
    expect(response.listenerCount("close")).toBe(0);
    runtime.stream.mockImplementation(() =>
      events(sequence([{ type: "run.started" }, complete("Done")])),
    );
    expect(
      (await request("/api/agent/stream", { threadId: "t", prompt: "Retry" }))
        .status,
    ).toBe(200);
  });
  it.each([
    null,
    [],
    { threadId: "", prompt: "Hello" },
    { threadId: "t".repeat(129), prompt: "Hello" },
    { threadId: "t", prompt: "x".repeat(12_001) },
    { threadId: "t", prompt: "x".repeat(32_001) },
    { threadId: "t", prompt: "" },
  ])(
    "rejects invalid or oversized input without retaining a thread lock",
    async (body) => {
      const request = server();
      const response = await request("/api/agent/stream", body);
      expect(response.status).toBe(400);
      expect(response.listenerCount("close")).toBe(0);
      expect(runtime.stream).not.toHaveBeenCalled();
      expect(
        (await request("/api/agent/stream", { threadId: "t", prompt: "Retry" }))
          .status,
      ).toBe(200);
    },
  );
  it.each(["cancel", "disconnect"])(
    "aborts on %s and releases the thread for the next request",
    async (mode) => {
      let signal!: AbortSignal;
      runtime.stream.mockImplementation(async function* (input) {
        signal = input.signal;
        yield scenarios.approval[0];
        await new Promise<void>((resolve) => {
          if (signal.aborted) resolve();
          else
            signal.addEventListener("abort", () => resolve(), { once: true });
        });
      });
      const request = server();
      const response = new ResponseFixture();
      const first = request(
        "/api/agent/stream",
        { threadId: "t", prompt: "Start" },
        {},
        response,
      );
      await vi.waitFor(() => expect(response.status).toBe(200));
      if (mode === "cancel") {
        expect(
          (
            await request("/api/agent/cancel", {
              threadId: "t",
              runId: "stale",
            })
          ).status,
        ).toBe(409);
        expect(signal.aborted).toBe(false);
        expect(
          (
            await request("/api/agent/cancel", {
              threadId: "t",
              runId: "fixture-run",
            })
          ).status,
        ).toBe(200);
      } else {
        response.destroyed = true;
        response.emit("close");
      }
      expect(signal.aborted).toBe(true);
      await first;
      expect(response.listenerCount("close")).toBe(0);
      runtime.stream.mockImplementation(() => events(scenarios.approval));
      expect(
        (await request("/api/agent/stream", { threadId: "t", prompt: "Next" }))
          .status,
      ).toBe(200);
    },
  );
  it("cleans up backpressure listeners when the client disconnects", async () => {
    const response = new ResponseFixture();
    response.write = (chunk) => {
      response.chunks.push(chunk);
      return false;
    };
    const request = server();
    const first = request(
      "/api/agent/stream",
      { threadId: "t", prompt: "Start" },
      {},
      response,
    );
    await vi.waitFor(() => expect(response.listenerCount("drain")).toBe(1));
    response.destroyed = true;
    response.emit("close");
    await first;
    expect(response.listenerCount("close")).toBe(0);
    expect(response.listenerCount("drain")).toBe(0);
  });
});
