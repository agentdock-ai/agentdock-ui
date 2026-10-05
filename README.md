<div align="center">
  <p><img src="./assets/agentdock-logo.png" alt="Agentdock" width="320" /></p>

  <h1>Composable chat UI for Agentdock</h1>

  <p>
    Build polished agent experiences with a typed React runtime and editable,
    installable chat components powered by Agentdock's event protocol.
  </p>

  <p>
    <a href="https://github.com/agentdock-ai/agentdock-ui"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827" /></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
    <img alt="TypeScript 5.8+" src="https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white" />
    <img alt="React 18+" src="https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=111827" />
  </p>
</div>

Agentdock UI pairs `@agentdock-ai/react`—a headless store, provider, hooks, and adapter types—with chat components the CLI installs directly into your app, so you can shape the interface to your product. Your app keeps control of requests, authentication, and transport while the UI consumes canonical Agentdock events.

## Install Chat

The intended released installer command is:

```sh
npx agentdock-ui add chat
```

The UI is implemented locally; publishing is a separate release step. To use this checkout:

```sh
yarn install
yarn build:packages
yarn registry:build
yarn cli:build
node packages/cli/dist/index.js add chat --cwd /path/to/app --yes
```

The host must have React, TypeScript, Tailwind CSS 4, a TypeScript alias and shadcn semantic tokens. Existing `components.json` selects Radix or Base UI primitives. The installer can create a missing configuration from an existing host theme/alias. `--dry-run` is read-only; repeated installs preserve consumer edits. Use `--overwrite` only when you intend to replace those edits.

## App-owned adapter

```tsx
import { Chat } from "@/components/agentdock-ui/chat";
import { decodeAgentEventStream, type ChatAdapter } from "@agentdock-ai/react";

// Construct this in the consuming app using its own request and auth rules.
export function createChatAdapter({
  endpoint,
  threadId,
  request,
}: {
  endpoint: string;
  threadId: string;
  request: typeof fetch;
}): ChatAdapter {
  return {
    async *sendMessage({ text, signal }) {
      const response = await request(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text, threadId }),
        signal,
      });
      if (!response.ok || !response.body) throw new Error("Request failed.");
      yield* decodeAgentEventStream(response.body, { signal });
    },
  };
}

// Keep this adapter stable for the lifetime of the app's current conversation.
<Chat adapter={chatAdapter} />;
```

Provide optional `cancelRun`, `respondToInterrupt`, and `continueRun` only when the consuming app supports them. `continueRun({ runId, signal })` yields canonical events for a paused run without a pending interrupt. Approval inputs stay opaque and are returned unchanged. Chat has no endpoint prop.

### Restore saved conversations

Load history in the consuming application and hydrate a fresh store before streaming:

```tsx
const store = new AgentStore();
store.hydrateHistory({ messages: normalizedMessages, resumeState });
<Chat adapter={chatAdapter} store={store} />;
```

Messages use canonical `messageId`, `role`, and `content` fields. Persisted replies
may also include `state: "stopped"` or `state: "error"` so partial content keeps its
display status after reload. These fields do not change native execution state. The application
owns checkpoint/provider normalization and attachment URLs. History is cloned,
validated, and rendered separately from execution events; no run IDs or events
are synthesized. Duplicate message IDs are rejected. Live messages reconcile
with saved messages by native ID. Hydration replaces history atomically and is
rejected during an active run or stream.

Optional `resumeState` is a fresh native waiting-state projection, such as
Agentdock's `getResumeState(threadId)`, with `runId: null`. It restores pending
interrupts or static pauses. `respondToInterrupt` and `continueRun` receive
`runId: null` until the server starts an actual resumed invocation; adapters must
target the app-owned authorized thread. `cancelRun` still requires a live run ID.

### Optional files and images

Provide `adapter.attachments` to enable the compact file/image controls, drag/drop,
paste, previews, upload status, retry and removal. Text-only adapters show no upload
controls. The app supplies `accept`, `maxFiles`, `maxFileSize` and
`upload({ file, signal })`, which returns a `ChatAttachment` with an app-owned ID,
name, byte size and canonical file/image display content. Uploads start when files
are selected. Send is blocked until each attachment is ready; removing a pending
file aborts its upload.

`sendMessage({ text, attachments, signal })` receives the uploaded descriptors.
The consuming app builds its request from these IDs and owns storage, authorization,
retention and conversion to model input. Attachment-only messages are supported.
The playground accepts text/code files (256 KB total per message) and PNG/JPEG/GIF/
WebP images (5 MB per file), up to five attachments. Its local in-memory storage
expires after 30 minutes. PDF/Office parsing and durable storage belong to the host;
image understanding requires a model that supports images.

The app owns authentication, authorization, endpoint URLs, thread identity, request construction, secrets, provider selection and business rules. The browser consumes canonical Agentdock events only. LangGraph, LangChain and provider events must be normalized on the server.

## UI surface

An optional app-owned workspace/sidebar surrounds the standalone Chat. The panel includes readable messages, safe Markdown, streaming, optional reasoning, compact tool disclosures, approvals, scoped errors, cancellation, an anchored composer and scroll-to-latest. Light/dark colors use host shadcn semantic tokens. No Agentdock theme provider or stylesheet is required.

Components are small and editable under `components/agentdock-ui`. The runtime also exposes `AgentProvider`, `AgentStore`, `useAgentState`, `useAgentStore`, `useAgentActions`, SSE stream decoding and `selectRenderModel` for custom interfaces.

The render model exposes one ordered `turn.items` transcript. `selectRenderModel`
requires reducer snapshots and their complete `turnEvents`, grouped across resumed
invocations. `AgentStore` maintains this history separately from its diagnostic log.

## Development and validation

```sh
yarn dev                  # Real Agentdock playground

yarn ci                   # Formatting, types, registry freshness, coverage, tests and builds
yarn test                 # Fast test run
yarn registry:build       # Rebuild manifests after editing source
yarn registry:sync        # Refresh the playground from canonical components
yarn registry:verify
yarn fixture:verify       # Clean Vite/Radix and Next.js/Base UI consumers
```

The playground keeps provider setup and transport in the consuming app. It supports local Ollama and server-configured OpenAI/OpenRouter credentials. The fixture review app is available with `yarn workspace @agentdock-ai/registry dev`; its controls are development harness UI.

The local playground API requires its own loopback Host and Origin for mutations. Its file tools operate inside `.sandbox`; `run_command` requires `checkOnly: true` and only checks JavaScript syntax. Running generated code requires a separately isolated execution service supplied by the consuming app.

[Registry](apps/registry/README.md) · [Installer](packages/cli/README.md)

## License

MIT.
