<div align="center">
  <table>
    <tr>
      <td align="center" bgcolor="#111827">
        <img src="./assets/agentdock-logo.png" alt="AgentDock" width="460" />
      </td>
    </tr>
  </table>

  <h1>React UI for AgentDock agents</h1>

  <p>
    Build a production chat experience for AgentDock with typed event streams,
    tool activity, run state, and composable React primitives.
  </p>

  <p>
    <a href="https://www.npmjs.com/package/@agentdock-ai/react"><img alt="npm version" src="https://img.shields.io/npm/v/@agentdock-ai/react?logo=npm&label=npm" /></a>
    <a href="https://github.com/agentdock-ai/agentdock-ui"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827" /></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
    <img alt="TypeScript 5.8+" src="https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white" />
    <img alt="React 18+" src="https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=111827" />
  </p>
</div>

`@agentdock-ai/react` is the UI layer for [AgentDock](https://github.com/agentdock-ai/agentdock). It turns the event stream from your AgentDock backend into a ready chat surface and a typed client-side store.

The package is designed for real applications: your server owns the model call, authentication, tools, sessions, and API keys. The browser package only consumes the stream you give it. It never calls a model provider or makes a hidden backend request.

## What you get

- **`AgentChatView`** — a ready chat surface with messages, status, tool calls, progress, results, and errors.
- **`AgentProvider`** — one shared store for a chat tree or application area.
- **`useAgentState` and `useAgentStore`** — read state or control the store from your own components.
- **`decodeAgentEventStream`** — decode newline-delimited AgentDock events from a `fetch()` response.
- **`consumeAgentStream`** — apply typed events to the store with optional cancellation.
- **Custom rendering** — replace the default content renderer for files, citations, media, or custom parts.

## Install

```bash
npm install @agentdock-ai/react
```

The package expects React 18 or newer. Your AgentDock backend is installed separately:

```bash
npm install @agentdock-ai/agentdock @agentdock-ai/models
```

## Quick start

Your server endpoint should run AgentDock and return one canonical AgentDock event as newline-delimited JSON (`application/x-ndjson`) for each line. The UI package handles the browser side:

```tsx
"use client";

import {
  AgentChatView,
  AgentProvider,
  consumeAgentStream,
  decodeAgentEventStream,
  useAgentStore,
} from "@agentdock-ai/react";

function Chat() {
  const store = useAgentStore();

  async function submit(input: string) {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });

    if (!response.ok || !response.body) {
      throw new Error("The agent request failed.");
    }

    await consumeAgentStream(
      store,
      decodeAgentEventStream(response.body),
    );
  }

  return <AgentChatView onSubmit={submit} />;
}

export function App() {
  return (
    <AgentProvider>
      <Chat />
    </AgentProvider>
  );
}
```

`AgentChatView` has sensible defaults and can be configured without replacing the component:

```tsx
<AgentChatView
  title="Support assistant"
  subtitle="Online"
  placeholder="Ask a question"
  renderContentPart={(part, index) => (
    <span key={index}>{part.type === "text" ? part.text : part.type}</span>
  )}
  onSubmit={submit}
/>
```

## Production boundary

Keep the following responsibilities in your application server:

- provider credentials and model configuration;
- authentication and authorization;
- AgentDock tools, approvals, sessions, and persistence;
- the endpoint that starts a run and returns the event stream.

Keep the following in the UI package:

- rendering the conversation and tool activity;
- decoding and applying canonical events;
- displaying run status and stream errors;
- composing your own controls around the shared store.

Authenticate every request before it can read or continue a session. Never send provider keys to the browser.

## Styling and customization

`AgentChatView` renders class names prefixed with `ad-`, so your application can style the component with its own CSS. Use `renderContentPart` when the default display for a content part is not enough. The lower-level store and hooks let you build a completely custom interface while keeping the same AgentDock event contract.

## Local development

This repository includes a Vite playground that runs the real AgentDock runtime and streams events through the same public API:

```bash
yarn install
yarn dev
```

Useful checks before publishing a change:

```bash
yarn typecheck
yarn test
yarn build
```

The playground reads local provider settings from `.env`. Copy `.env.example` and keep credentials on the local server.

## Related packages

- [AgentDock runtime](https://github.com/agentdock-ai/agentdock) — runs agents, tools, approvals, sessions, and persistence.
- [AgentDock documentation](https://github.com/agentdock-ai/docs) — simple guides for the runtime and its model API.
- [AgentDock UI on npm](https://www.npmjs.com/package/@agentdock-ai/react)

## License

MIT. You can use AgentDock UI in open-source and commercial applications. Your application remains responsible for its own provider, infrastructure, security, and dependency obligations.
