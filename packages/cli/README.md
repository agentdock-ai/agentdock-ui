# agentdock-ui

Source-copy installer for the V1 chat panel:

```sh
npx agentdock-ui add chat --cwd ./my-app
npx agentdock-ui add chat --dry-run
```

Before the first release is published, build and run the local CLI:

```sh
yarn registry:build
yarn cli:build
node packages/cli/dist/index.js add chat --cwd ./my-app --yes
```

Requires an existing React/TypeScript app, Tailwind CSS, shadcn semantic tokens and a resolvable TypeScript alias. Existing `components.json` selects Radix or Base UI. Without it, the installer can create a configuration using the app's existing theme and alias. Missing prerequisites fail before copying files.

`--dry-run` is read-only. `--yes` accepts initial setup and preserves edited files. `--overwrite` explicitly permits replacing edited files. Interactive installs ask before replacing edits. Repeat installs use a receipt to preserve consumer customizations and avoid adding dependencies twice. Supported package managers: npm, pnpm, Yarn and Bun.

Existing dependency ranges and installed versions are checked before copying source. Incompatible or unverifiable local dependencies fail with an actionable error; the installer does not silently upgrade them. Nested apps inherit their workspace's package-manager declaration or lockfile.

```tsx
import { Chat } from "@/components/agentdock-ui/chat";
import type { ChatAdapter } from "@agentdock-ai/react";

// Construct this in your app using its identity, request and authorization rules.
const chatAdapter: ChatAdapter = appChatAdapter;

<Chat adapter={chatAdapter} />;
```

`sendMessage` yields canonical Agentdock events. Provide `cancelRun`, `respondToInterrupt`, and `continueRun` only when the app supports those operations. `continueRun` resumes a paused run without a pending interrupt. No endpoint prop is available.
