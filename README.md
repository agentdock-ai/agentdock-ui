<div align="center">
  <table>
    <tr>
      <td align="center" bgcolor="#111827">
        <img src="./assets/agentdock-logo.png" alt="Agentdock" width="460" />
      </td>
    </tr>
  </table>

  <h1>React UI for Agentdock agents</h1>

  <p>
    Build a production chat experience for Agentdock with typed event streams,
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

`@agentdock-ai/react` is the UI layer for [Agentdock](https://github.com/agentdock-ai/agentdock). It turns the event stream from your Agentdock backend into a ready chat surface and a typed client-side store.

The package is designed for real applications: your server owns the model call, authentication, tools, sessions, and API keys. The browser package only consumes the stream you give it. It never calls a model provider or makes a hidden backend request.

## What you get

- **`AgentChatView`** — a ready chat surface with messages, status, tool calls, progress, results, and errors.
- **Message components** — compose `Message`, `UserMessage`, `AssistantMessage`, `ToolMessage`, and `MessageContent` directly when you need a custom chat layout.
- **`AgentProvider`** — one shared store for a chat tree or application area.
- **`useAgentState` and `useAgentStore`** — read state or control the store from your own components.
- **`decodeAgentEventStream`** — decode newline-delimited Agentdock events from a `fetch()` response.
- **`consumeAgentStream`** — apply typed events to the store with optional cancellation.
- **Custom rendering** — replace the default content renderer for files, citations, media, or custom parts.

## Install

```bash
npm install @agentdock-ai/react
```

The package expects React 18 or newer. Your Agentdock backend is installed separately:

```bash
npm install @agentdock-ai/agentdock @agentdock-ai/models
```

## Quick start

Your server endpoint should run Agentdock and return one canonical Agentdock event as newline-delimited JSON (`application/x-ndjson`) for each line. The UI package handles the browser side:

```tsx
"use client";

import {
  AgentChatView,
  AgentDockTheme,
  AssistantMessage,
  Message,
  MessageContent,
  UserMessage,
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
- Agentdock tools, approvals, sessions, and persistence;
- the endpoint that starts a run and returns the event stream.

Keep the following in the UI package:

- rendering the conversation and tool activity;
- decoding and applying canonical events;
- displaying run status and stream errors;
- composing your own controls around the shared store.

Authenticate every request before it can read or continue a session. Never send provider keys to the browser.

## Styling and customization

`AgentChatView` renders class names prefixed with `ad-`, so your application can style the component with its own CSS. Its message rows are composed from `Message`, `UserMessage`, `AssistantMessage`, and `ToolMessage`; `MessageContent` owns the default content-part renderer. Use `renderContentPart` when the default display for a content part is not enough. The lower-level store and hooks let you build a completely custom interface while keeping the same Agentdock event contract.

## Component layers and theming

The package is organized into three public layers:

- @agentdock-ai/react/components/ui contains native primitives, class-name composition, and theme tokens.
- @agentdock-ai/react/components/message contains Message, UserMessage, AssistantMessage, ToolMessage, and MessageContent.
- @agentdock-ai/react/components/chat contains AgentChatView, the composer, header, typing indicator, and tool activity.

Use AgentDockTheme for global CSS variables, or pass the same theme configuration directly to AgentChatView:

~~~tsx
<AgentDockTheme mode="system" tokens={{ primary: "#7c3aed" }}>
  <AgentChatView
    classNames={{
      root: "rounded-xl",
      message: {
        root: "my-message",
        content: "prose prose-sm",
      },
      composer: "border-violet-300",
    }}
    onSubmit={submit}
  />
</AgentDockTheme>
~~~

The theme exposes --ad-* variables such as --ad-primary, --ad-surface, --ad-foreground, and --ad-border. They can be mapped to Tailwind or application brand tokens in global CSS. Every surface also emits a data-slot attribute for selector-based styling.

## Local development

This repository includes a Vite playground that runs the real Agentdock runtime and streams events through the same public API:

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

- [Agentdock runtime](https://github.com/agentdock-ai/agentdock) — runs agents, tools, approvals, sessions, and persistence.
- [Agentdock documentation](https://github.com/agentdock-ai/docs) — simple guides for the runtime and its model API.
- [Agentdock UI on npm](https://www.npmjs.com/package/@agentdock-ai/react)

## License

MIT. You can use Agentdock UI in open-source and commercial applications. Your application remains responsible for its own provider, infrastructure, security, and dependency obligations.
