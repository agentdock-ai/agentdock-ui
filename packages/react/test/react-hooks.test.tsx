// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentStore } from "@agentdock-ai/ui-core";
import { AgentProvider, useAgentStore } from "../src/react/agent-provider.js";
import { useAgentState } from "../src/react/use-agent-state.js";
import { useAgentActions } from "../src/react/use-agent-actions.js";
import type { ChatAdapter } from "../src/react/chat-adapter.js";
import { scenarios } from "../../../scripts/fixtures/events.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
let actions: ReturnType<typeof useAgentActions>;
let captured: AgentStore;
const adapter: ChatAdapter = {
  async *sendMessage() {
    yield* scenarios.conversation;
  },
};
function Probe({
  adapter: value = adapter,
  ready,
}: {
  adapter?: ChatAdapter;
  ready?: (value: ReturnType<typeof useAgentActions>) => void;
}) {
  captured = useAgentStore();
  const snapshot = useAgentState();
  actions = useAgentActions(value);
  useEffect(() => ready?.(actions), []);
  return (
    <p>
      {snapshot.agent.status}:{snapshot.agent.messages.length}:
      {String(actions.busy)}:{String(actions.canCancel)}:
      {String(actions.canRespond)}:{String(actions.canContinue)}
    </p>
  );
}
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("headless React integration", () => {
  it("uses an app-owned store, subscribes to changes and dispatches through the adapter", async () => {
    const store = new AgentStore();
    await act(async () =>
      root.render(
        <AgentProvider store={store}>
          <Probe />
        </AgentProvider>,
      ),
    );
    expect(captured).toBe(store);
    expect(host.textContent).toBe("idle:0:false:false:false:false");
    await act(async () => {
      expect(await actions.sendMessage("Hello")).toBe(true);
    });
    expect(host.textContent).toBe("completed:2:false:false:false:false");
    await act(async () => store.reset());
    expect(host.textContent).toBe("idle:0:false:false:false:false");
    expect(await actions.cancelRun()).toBe(false);
    expect(await actions.continueRun()).toBe(false);
    expect(await actions.respondToInterrupt("missing", [])).toBe(false);
  });
  it("owns one stable store across rerenders when no store is provided", async () => {
    await act(async () =>
      root.render(
        <AgentProvider>
          <Probe />
        </AgentProvider>,
      ),
    );
    const initial = captured;
    await act(async () => initial.appendUserMessage("Local"));
    await act(async () =>
      root.render(
        <AgentProvider>
          <Probe />
        </AgentProvider>,
      ),
    );
    expect(captured).toBe(initial);
    expect(host.textContent).toContain("idle:1:");
  });
  it("switches stores without leaking old subscriptions", async () => {
    const first = new AgentStore();
    const second = new AgentStore();
    await act(async () =>
      root.render(
        <AgentProvider store={first}>
          <Probe />
        </AgentProvider>,
      ),
    );
    await act(async () =>
      root.render(
        <AgentProvider store={second}>
          <Probe />
        </AgentProvider>,
      ),
    );
    await act(async () => first.appendUserMessage("Old"));
    expect(host.textContent).toContain("idle:0:");
    await act(async () => second.appendUserMessage("New"));
    expect(captured).toBe(second);
    expect(host.textContent).toContain("idle:1:");
  });
  it("aborts an old adapter stream on replacement and accepts a new stream", async () => {
    const store = new AgentStore();
    let signal: AbortSignal | undefined;
    const quiet: ChatAdapter = {
      sendMessage(input) {
        signal = input.signal;
        return {
          [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
        };
      },
    };
    await act(async () =>
      root.render(
        <AgentProvider store={store}>
          <Probe adapter={quiet} />
        </AgentProvider>,
      ),
    );
    let pending: Promise<boolean>;
    await act(async () => {
      pending = actions.sendMessage("Old");
    });
    expect(host.textContent).toContain(":true:");
    await act(async () =>
      root.render(
        <AgentProvider store={store}>
          <Probe />
        </AgentProvider>,
      ),
    );
    expect(signal?.aborted).toBe(true);
    expect(await pending!).toBe(false);
    await act(async () => {
      expect(await actions.sendMessage("New")).toBe(true);
    });
    expect(store.getSnapshot().runs).toHaveLength(2);
  });
  it("aborts local consumption on unmount and leaves detached actions unavailable", async () => {
    let signal: AbortSignal | undefined;
    const quiet: ChatAdapter = {
      sendMessage(input) {
        signal = input.signal;
        return {
          [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
        };
      },
    };
    await act(async () =>
      root.render(
        <AgentProvider>
          <Probe adapter={quiet} />
        </AgentProvider>,
      ),
    );
    const detached = actions;
    let pending: Promise<boolean>;
    await act(async () => {
      pending = actions.sendMessage("Hello");
    });
    await act(async () => root.unmount());
    expect(signal?.aborted).toBe(true);
    expect(await pending!).toBe(false);
    expect(await detached.sendMessage("No")).toBe(false);
    expect(await detached.cancelRun()).toBe(false);
    expect(await detached.continueRun()).toBe(false);
    expect(await detached.respondToInterrupt("No", [])).toBe(false);
  });
  it("does not dispatch until effects mount and exposes only provided capabilities", async () => {
    let result: Promise<boolean> | undefined;
    const capable: ChatAdapter = {
      ...adapter,
      async cancelRun() {},
      async *continueRun() {},
      async *respondToInterrupt() {},
    };
    await act(async () =>
      root.render(
        <AgentProvider>
          <Probe
            adapter={capable}
            ready={(value) => {
              result = value.sendMessage("Hello");
            }}
          />
        </AgentProvider>,
      ),
    );
    expect(await result).toBe(true);
    expect(host.textContent).toContain(":true:true:true");
  });
  it("supports a server snapshot and reports missing provider context", () => {
    function StateOnly() {
      return <span>{useAgentState().agent.status}</span>;
    }
    expect(
      renderToStaticMarkup(
        <AgentProvider>
          <StateOnly />
        </AgentProvider>,
      ),
    ).toBe("<span>idle</span>");
    expect(() => renderToStaticMarkup(<StateOnly />)).toThrow(
      "inside AgentProvider",
    );
  });
});
