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

AgentDock UI V1 is a compact, editable chat panel backed by the canonical AgentDock event contract. `@agentdock-ai/react` supplies the headless store, provider, hooks and adapter types. Styled components are copied into your application from the registry.

## Install Chat

The intended released installer command is:

```sh
npx agentdock-ui add chat
```

V1 is implemented locally; publishing is a separate release step. To use this checkout:

```sh
yarn install
yarn build:packages
yarn registry:build
yarn cli:build
node packages/cli/dist/index.js add chat --cwd /path/to/app --yes
```

The host must have React, TypeScript, Tailwind CSS, a TypeScript alias and shadcn semantic tokens. Existing `components.json` selects Radix or Base UI primitives. The installer can create a missing configuration from an existing host theme/alias. `--dry-run` is read-only; repeated installs preserve consumer edits. Use `--overwrite` only when you intend to replace those edits.

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

Provide optional `cancelRun` and `respondToInterrupt` only when the consuming app supports them. Approval inputs stay opaque and are returned unchanged. Chat has no endpoint prop.

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

The app owns authentication, authorization, endpoint URLs, thread identity, request construction, secrets, provider selection and business rules. The browser consumes canonical AgentDock events only. LangGraph, LangChain and provider events must be normalized on the server.

## V1 surface

An optional app-owned workspace/sidebar surrounds the standalone Chat. The panel includes readable messages, safe Markdown, streaming, optional reasoning, compact tool disclosures, approvals, scoped errors, cancellation, an anchored composer and scroll-to-latest. Light/dark colors use host shadcn semantic tokens. No AgentDock theme provider or stylesheet is required.

Components are small and editable under `components/agentdock-ui`. The runtime also exposes `AgentProvider`, `AgentStore`, `useAgentState`, `useAgentStore`, `useAgentActions`, stream decoding and render selectors for custom interfaces.

## Migration

The runtime root is headless. Legacy styled exports remain under `@agentdock-ai/react/components`, with the existing narrower component and stylesheet subpaths retained throughout V1. Legacy source and CSS are preserved. See [the migration guide](AGENTDOCK_UI_V1_MIGRATION.md).

## Development and validation

```sh
yarn dev                  # Real AgentDock playground

yarn typecheck
yarn test
yarn build
yarn registry:verify
yarn fixture:verify       # Clean Vite/Radix and Next.js/Base UI consumers
```

The playground keeps provider setup and transport in the consuming app. It supports local Ollama and server-configured OpenAI/OpenRouter credentials. The fixture review app is available with `yarn workspace @agentdock-ai/registry dev`; its controls are development harness UI.

[Implementation checklist](AGENTDOCK_UI_V1_CHECKLIST.md) · [Review record](AGENTDOCK_UI_V1_REVIEW.md) · [Registry](apps/registry/README.md) · [Installer](packages/cli/README.md)

## License

MIT.
