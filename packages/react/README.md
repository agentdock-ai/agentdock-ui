<div align="center">
  <p><img src="https://raw.githubusercontent.com/agentdock-ai/agentdock-ui/main/assets/agentdock-logo.png" alt="Agentdock" width="300" /></p>
  <h1>@agentdock-ai/react</h1>
  <p>React state and streaming hooks for applications that consume Agentdock events.</p>
  <p>
    <a href="https://www.npmjs.com/package/@agentdock-ai/react"><img alt="npm version" src="https://img.shields.io/npm/v/%40agentdock-ai%2Freact?label=npm" /></a>
    <a href="https://github.com/agentdock-ai/agentdock-ui"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827" /></a>
    <img alt="React 18+" src="https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=111827" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white" />
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
  </p>
</div>

`@agentdock-ai/react` connects React components to the headless Agentdock UI
runtime. It provides a shared store context, state and action hooks, a typed
application adapter, and helpers for the optional Conversations HTTP API.

The package does not render a prebuilt chat interface. To add the editable Chat
component and its local UI files, use the [`agentdock-ui` installer](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/cli).

## Install

```bash
npm install @agentdock-ai/react react
```

React 18 or newer is a peer dependency. The package installs
`@agentdock-ai/ui-core` and `@agentdock-ai/contracts` automatically.

## Connect your app to an event stream

The application builds requests and owns authentication, thread identity, and
server authorization. The adapter returns canonical Agentdock events:

```tsx
import {
  AgentProvider,
  decodeAgentEventStream,
  useAgentActions,
  useAgentState,
  type ChatAdapter,
} from "@agentdock-ai/react";

const adapter: ChatAdapter = {
  async *sendMessage({ text, signal }) {
    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: text }),
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Agent request failed (${response.status}).`);
    }
    yield* decodeAgentEventStream(response.body, { signal });
  },
};

function ChatControls() {
  const { renderModel } = useAgentState();
  const { sendMessage, busy } = useAgentActions(adapter);
  // Render the renderModel and call sendMessage("Hello") from your UI.
  return (
    <button disabled={busy} onClick={() => void sendMessage("Hello")}>
      Send
    </button>
  );
}

export function App() {
  return (
    <AgentProvider>
      <ChatControls />
    </AgentProvider>
  );
}
```

Hooks that read the store must be rendered under `AgentProvider`. Supply a
long-lived `AgentStore` with its `store` prop when your application needs to
control store lifetime outside React.

## Optional run capabilities

Add methods to `ChatAdapter` only when the application supports them:

- `cancelRun` sends a cancellation request for the active run.
- `respondToInterrupt` submits decisions for a pending interrupt.
- `continueRun` resumes a native pause that has no pending interrupt.
- `attachments` uploads files and supplies app-owned attachment IDs and display
  content to `sendMessage`.

The React hooks expose these capabilities through `useAgentActions`. The UI
runtime does not invent server endpoints, authorization rules, or request bodies.

## Conversation API helpers

For servers using `@agentdock-ai/conversations`, `createConversationClient`
provides thread listing, creation, rename, history, streaming, approval,
continuation, cancellation, and attachment methods. Pass an application-owned
`fetcher` when requests need cookies, tokens, or custom refresh behavior; use
`useConversations(client)` to manage selection and history in React.

```tsx
import {
  createConversationClient,
  useConversations,
} from "@agentdock-ai/react";

const client = createConversationClient({
  baseUrl: "/api",
  getThreadId: () => selectedThreadId,
  fetcher: authenticatedFetch,
});

function ThreadList() {
  const { threads, create, select } = useConversations(client);
  // Render threads and call create() or select(thread.id).
  return (
    <button onClick={() => void create()}>
      New conversation ({threads.length})
    </button>
  );
}
```

The client expects the Conversation HTTP routes documented by
[`@agentdock-ai/conversations`](https://github.com/agentdock-ai/agentdock/tree/main/packages/conversations).

## Related packages

- [`@agentdock-ai/ui-core`](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/ui-core)
  contains the framework-independent store and transcript primitives.
- [`@agentdock-ai/agentdock-ui`](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/cli)
  installs the editable Chat source into a host application.
- [`@agentdock-ai/agentdock`](https://github.com/agentdock-ai/agentdock)
  provides the server-side LangGraph adapter.

## License

MIT.
