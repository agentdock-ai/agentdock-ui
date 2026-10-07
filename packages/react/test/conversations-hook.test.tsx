// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useConversations } from "../src/react/use-conversations.js";
import type { ConversationClient } from "../src/react/conversation-client.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const first = {
  id: "one",
  title: "One",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const second = { ...first, id: "two", title: "Two" };
let host: HTMLDivElement;
let root: Root;
let state: ReturnType<typeof useConversations>;
let client: ConversationClient;
let historyCalls: Array<{ id: string; cursor?: string | null }>;

function history(
  thread: typeof first,
  position: number,
  nextCursor: string | null,
) {
  return {
    protocolVersion: 1 as const,
    thread,
    messages:
      position < 0
        ? []
        : [
            {
              id: `message-${position}`,
              turnId: "turn",
              operationId: "operation",
              position,
              role: "user" as const,
              content: [{ type: "text" as const, text: "Message" }],
              outcome: "complete" as const,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
    nextCursor,
    snapshotId: "snapshot",
    execution: null,
    nativeControls: { pendingNodes: [], interrupts: [] },
    interrupts: [],
    actions: {
      canStart: true,
      canStop: false,
      canContinue: false,
      canRespondToInterrupt: false,
    },
  };
}

function Probe() {
  state = useConversations(client);
  return <span>{state.selectedThread?.id ?? "none"}</span>;
}

beforeEach(() => {
  historyCalls = [];
  client = {
    adapter: {} as ConversationClient["adapter"],
    async listThreads(_signal, cursor) {
      return {
        protocolVersion: 1,
        threads: cursor ? [second] : [first],
        nextCursor: cursor ? null : "thread-cursor",
      };
    },
    async createThread(title) {
      return { ...second, title: title ?? second.title };
    },
    async renameThread(id, title) {
      return { ...(id === first.id ? first : second), title };
    },
    async getHistory(id, _signal, cursor) {
      historyCalls.push({ id, cursor });
      return cursor
        ? history(id === first.id ? first : second, 0, null)
        : {
            ...history(id === first.id ? first : second, 1, "older"),
            messages: [
              history(id === first.id ? first : second, 0, null).messages[0]!,
              history(id === first.id ? first : second, 1, null).messages[0]!,
            ],
          };
    },
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("refreshes, pages the catalog/history, creates, renames, and selects without stale transcript mixing", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  expect(state.threads.map((thread) => thread.id)).toEqual([first.id]);
  expect(state.hasMoreThreads).toBe(true);

  await act(async () => state.select(first.id));
  expect(state.history?.messages.map((message) => message.position)).toEqual([
    0, 1,
  ]);
  await act(async () => state.loadOlderHistory());
  expect(state.history?.messages.map((message) => message.position)).toEqual([
    0, 1,
  ]);
  expect(state.history?.nextCursor).toBeNull();

  await act(async () => state.loadMoreThreads());
  expect(state.threads.map((thread) => thread.id)).toEqual([
    first.id,
    second.id,
  ]);
  expect(state.hasMoreThreads).toBe(false);
  await act(async () => state.rename(first.id, "Renamed"));
  expect(state.threads[0]?.title).toBe("Renamed");
  await act(async () => state.select(second.id));
  expect(host.textContent).toBe(second.id);
  expect(historyCalls.some((call) => call.cursor === "older")).toBe(true);
  await act(async () => state.create("Third"));
  expect(state.selectedThread?.id).toBe(second.id);
});

it("contains initial and history failures and ignores actions without a cursor or selection", async () => {
  client.listThreads = async () => {
    throw "catalog offline";
  };
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  expect(state.error).toBe("Could not load conversations.");
  await act(async () => state.loadMoreThreads());
  await act(async () => state.refreshHistory());

  client.listThreads = async () => ({
    protocolVersion: 1,
    threads: [first],
    nextCursor: null,
  });
  await act(async () => state.refresh());
  client.getHistory = async () => {
    throw new Error("history unavailable");
  };
  await act(async () => state.select(first.id));
  expect(state.error).toBe("history unavailable");
  expect(state.loading).toBe(false);
});

it("reports paging and refresh failures and keeps the latest selection when requests finish out of order", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  await act(async () => state.select(first.id));
  client.getHistory = async (_id, _signal, cursor) => {
    if (cursor) throw "older history unavailable";
    throw "refresh failed";
  };
  await act(async () => state.loadOlderHistory());
  expect(state.error).toBe("Could not load earlier messages.");
  client.getHistory = async (_id, _signal, cursor) => {
    if (cursor) throw new Error("older page failed");
    throw "refresh failed";
  };
  await act(async () => state.loadOlderHistory());
  expect(state.error).toBe("older page failed");
  await act(async () => state.refreshHistory(first.id));
  expect(state.error).toBe("Could not refresh conversation state.");
  await act(async () => state.refreshHistory(second.id));
  client.getHistory = async () => {
    throw new Error("refresh failed");
  };
  await act(async () => state.refreshHistory(first.id));
  expect(state.error).toBe("refresh failed");

  let resolveOne!: (value: ReturnType<typeof history>) => void;
  client.getHistory = async (id) =>
    id === first.id
      ? new Promise((resolve) => {
          resolveOne = resolve;
        })
      : history(second, 0, null);
  let stale!: Promise<void>;
  await act(async () => {
    stale = state.select(first.id);
  });
  await act(async () => state.select(second.id));
  await act(async () => resolveOne(history(first, 0, null)));
  await stale;
  expect(state.selectedThread?.id).toBe(second.id);

  let rejectStale!: (cause: unknown) => void;
  client.getHistory = async (id) =>
    id === first.id
      ? new Promise((_resolve, reject) => {
          rejectStale = reject;
        })
      : history(second, 0, null);
  let staleFailure!: Promise<void>;
  await act(async () => {
    staleFailure = state.select(first.id);
  });
  await act(async () => state.select(second.id));
  await act(async () => rejectStale(new Error("stale failure")));
  await staleFailure;
  expect(state.selectedThread?.id).toBe(second.id);
});

it("aborts pending history work on unmount and keeps unrelated selection during rename", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  await act(async () => state.select(first.id));
  await act(async () => state.rename(second.id, "Changed"));
  expect(state.selectedThread?.id).toBe(first.id);
  let signal: AbortSignal | undefined;
  client.getHistory = async (_id, incoming) => {
    signal = incoming;
    return new Promise(() => undefined);
  };
  await act(async () => {
    void state.select(second.id);
  });
  await act(async () => root.unmount());
  expect(signal?.aborted).toBe(true);
  root = createRoot(host);
});

it("updates the selected thread after a successful refresh and suppresses cancelled failures", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  await act(async () => state.select(first.id));
  await act(async () => state.loadMoreThreads());
  await act(async () => state.refreshHistory());
  expect(state.history?.thread.id).toBe(first.id);

  client.listThreads = async () => {
    throw new Error("refresh network failure");
  };
  await act(async () => {
    await expect(state.refresh()).rejects.toThrow("refresh network failure");
  });
  expect(state.error).toBe("refresh network failure");

  let rejectHistory!: (cause: unknown) => void;
  client.getHistory = async (id, _signal, cursor) =>
    cursor
      ? new Promise((_resolve, reject) => {
          rejectHistory = reject;
        })
      : history(id === first.id ? first : second, 0, null);
  await act(async () => {
    void state.loadOlderHistory();
  });
  await act(async () => state.select(second.id));
  await act(async () => rejectHistory(new Error("aborted history request")));
  expect(state.selectedThread?.id).toBe(second.id);
});

it("uses the generic selection error for non-Error failures", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => Promise.resolve());
  client.getHistory = async () => {
    throw "history failed";
  };
  await act(async () => state.select(first.id));
  expect(state.error).toBe("Could not load conversation.");
});
