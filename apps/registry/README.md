# AgentDock UI V1 registry

Editable Chat source lives in `registry/agentdock-ui`. The browser consumes only the headless AgentDock render model through `<Chat adapter={chatAdapter} />`.

The consuming app owns authentication, authorization, endpoint URLs, thread identity, request bodies, provider configuration and business rules. Chat never fetches an endpoint or imports a provider runtime.

File/image controls are enabled only by the optional `ChatAdapter.attachments`
capability. The copied picker, previews and upload draft hook call the app's upload
method; the app owns accept/size/count limits, storage and attachment IDs sent with
the message. Canonical file/image content remains the transcript representation.

## Build and review

From the workspace root:

```sh
yarn registry:build
yarn registry:verify
yarn workspace @agentdock-ai/registry dev
```

The review app covers all canonical events plus empty, long-content, unsafe-content, dark-mode and narrow-screen states. `?baseline=1` loads the isolated legacy comparison. `?capabilities=send-only` reviews unsupported cancellation and approvals. To review Base UI, start with `AGENTDOCK_PRIMITIVE=base`.

Manifests are generated from the canonical source for Radix and Base UI. Files copy into the host's `components/agentdock-ui`, including local primitive adapters. The host's existing semantic Tailwind tokens supply light/dark styling; no AgentDock stylesheet or theme provider is required.

Versioned manifests under `public/r/v1` are bundled in the installer. No hosted registry URL is assumed. Generated artifacts must pass source freshness and dependency closure checks before release.
