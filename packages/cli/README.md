<div align="center">
  <p><img src="https://raw.githubusercontent.com/agentdock-ai/agentdock-ui/main/assets/agentdock-logo.png" alt="Agentdock" width="300" /></p>
  <h1>@agentdock-ai/agentdock-ui</h1>
  <p>Install editable Agentdock Chat source into your React application.</p>
  <p>
    <a href="https://www.npmjs.com/package/@agentdock-ai/agentdock-ui"><img alt="npm version" src="https://img.shields.io/npm/v/%40agentdock-ai%2Fagentdock-ui?label=npm" /></a>
    <a href="https://github.com/agentdock-ai/agentdock-ui"><img alt="License MIT" src="https://img.shields.io/badge/license-MIT-111827" /></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white" />
    <img alt="React 18+" src="https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=111827" />
  </p>
</div>

`@agentdock-ai/agentdock-ui` copies the editable Chat component and required local UI
primitives into your project. The source becomes part of your app, so you can
inspect, customize, and maintain it alongside your own components.

## Quick start

```bash
npx @agentdock-ai/agentdock-ui add chat
```

Target an app in a monorepo or preview the install first:

```bash
npx @agentdock-ai/agentdock-ui add chat --cwd ./apps/web
npx @agentdock-ai/agentdock-ui add chat --dry-run
```

The installer detects npm, pnpm, Yarn, or Bun; checks required dependencies and
versions; and copies the appropriate Radix or Base UI component variant. Missing
dependencies are installed with the detected package manager. The local Chat
source imports `@agentdock-ai/react`, which supplies the app-facing store and
streaming hooks.

## Requirements

- React 18 or newer and a TypeScript application.
- Tailwind CSS 4, a resolvable TypeScript alias, and shadcn semantic theme tokens.
- If `components.json` exists, it selects the Radix or Base UI primitives. If it
  does not, the installer can create one using the detected alias and theme.

The consuming app owns authentication, requests, thread identity, server
authorization, model configuration, and persistence. The copied Chat component
receives a `ChatAdapter`; it does not call a hard-coded endpoint.

## Install behavior

- `--dry-run` inspects the project without writing files or installing packages.
- Interactive installs ask before replacing edited files.
- `--yes` accepts initial configuration and preserves edited files.
- `--overwrite` explicitly allows replacing edited files.
- Repeat installs use a receipt to preserve local changes and avoid installing
  the same dependencies again.

An incompatible or unverifiable dependency fails with an actionable message
before any Chat source is copied. In Yarn workspaces, dependency updates are
applied using the workspace's package manager configuration.

## Use the installed Chat

```tsx
import { Chat } from "@/components/agentdock-ui/chat";
import type { ChatAdapter } from "@agentdock-ai/react";

const adapter: ChatAdapter = appOwnedChatAdapter;

export function ConversationPanel() {
  return <Chat adapter={adapter} />;
}
```

Provide optional adapter capabilities only when your server implements them:
`cancelRun`, `respondToInterrupt`, `continueRun`, and `attachments`.

## Related packages

- [`@agentdock-ai/react`](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/react)
  provides React hooks and the typed Chat adapter contract.
- [`@agentdock-ai/ui-core`](https://github.com/agentdock-ai/agentdock-ui/tree/main/packages/ui-core)
  provides framework-independent event and transcript state.
- [`@agentdock-ai/agentdock`](https://github.com/agentdock-ai/agentdock)
  serves compiled LangGraph agents.

## License

MIT.
