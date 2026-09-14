# @agentdock-ai/react

React primitives for consuming AgentDock event streams. The consuming application owns its backend request and passes the resulting typed `AsyncIterable<AgentEvent>` to this package; this package does not make network requests.

```tsx
import { AgentProvider, useAgentState, useAgentStore, consumeAgentStream } from "@agentdock-ai/react";

function Chat() {
  const store = useAgentStore();
  const { agent, streamStatus } = useAgentState();

  async function send(input: string) {
    const events = await myBackend.startRun(input);
    await consumeAgentStream(store, events);
  }

  return <pre>{JSON.stringify({ agent, streamStatus })}</pre>;
}

export function App() {
  return <AgentProvider><Chat /></AgentProvider>;
}
```

The store reduces events with `@agentdock-ai/contracts`, keeping stream transport status separate from agent run status. HTTP response decoding is intentionally an adapter concern; a decoder can be added once the backend wire format is selected.
