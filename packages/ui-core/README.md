<div align="center">
  <p><img src="https://raw.githubusercontent.com/agentdock-ai/agentdock-ui/main/assets/agentdock-logo.png" alt="Agentdock" width="300" /></p>
  <h1>@agentdock-ai/ui-core</h1>
  <p>Framework-independent state, event-stream, and transcript primitives for Agentdock clients.</p>
  <p>
    <a href="https://www.npmjs.com/package/@agentdock-ai/ui-core"><img alt="npm version" src="https://img.shields.io/npm/v/%40agentdock-ai%2Fui-core?label=npm" /></a>
    <a href="https://github.com/agentdock-ai/agentdock-ui"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827" /></a>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white" />
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
  </p>
</div>

`@agentdock-ai/ui-core` is the headless client foundation for Agentdock event
streams. It validates and reduces canonical events, tracks local stream status,
keeps saved conversation history separate from live execution, and projects an
ordered render model for any UI framework.

## Install

```bash
npm install @agentdock-ai/ui-core
```

The package installs `@agentdock-ai/contracts` as a dependency. Import its
contract types through `ui-core` or directly from `@agentdock-ai/contracts`.

## Consume an Agentdock event stream

The application owns the request, authentication, cancellation policy, and
conversation persistence. Pass the canonical SSE response body to the stream
decoder and store:

```ts
import {
  AgentStore,
  consumeAgentStream,
  decodeAgentEventStream,
} from "@agentdock-ai/ui-core";

const store = new AgentStore();
const response = await fetch("/api/agent/run", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ prompt: "Hello" }),
});

if (!response.ok || !response.body) {
  throw new Error(`Agent request failed (${response.status}).`);
}

const controller = new AbortController();
await consumeAgentStream(
  store,
  decodeAgentEventStream(response.body, { signal: controller.signal }),
  { signal: controller.signal },
);

const { renderModel } = store.getSnapshot();
```

`AgentStore` also exposes `subscribe` and `getSnapshot` for external-store
integrations, `appendUserMessage` for optimistic display, and `hydrateHistory`
for application-loaded transcript messages. `selectRenderModel` is available
when you maintain the canonical reducer snapshots and complete event history
yourself.

## Included primitives

- **`AgentStore`** validates events and retains reducer state, per-turn event
  history, saved messages, and stream lifecycle separately.
- **`decodeAgentEventStream`** parses canonical Agentdock SSE `data:` frames into
  validated events and supports aborting a pending read.
- **`consumeAgentStream`** applies an async event stream to a store and records
  whether the local transport closed, stopped, or failed.
- **`selectRenderModel`** projects ordered message, tool, approval, and error
  items from canonical event history.
- **TypeScript types** describe Agentdock events, store snapshots, render items,
  conversation history, tool activity, and approval state.

This package does not make HTTP requests, execute agents or tools, decide
authorization, or persist data. Those responsibilities stay in the consuming
application and its server.

## Related packages

- [`@agentdock-ai/react`](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/react)
  adds React providers and hooks over these primitives.
- [`@agentdock-ai/agentdock`](https://github.com/agentdock-ai/agentdock) serves
  compiled LangGraph agents and emits the canonical events.

## License

MIT.
