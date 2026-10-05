# Agentdock UI cleanup review

Reviewed and updated the UI runtime, React hooks/actions, component registry, installer, playground adapters and configuration, generated artifacts, and tests. The checkout was clean before this work. Changes are local and unpublished.

## One current architecture

- The runtime is headless. Removed the deprecated packaged component tree, stylesheet, theme provider, styled subpath exports, stylesheet copier and legacy comparison screen.
- Removed `selectRenderMessages`, `RenderMessage`, the separate reasoning projection, `RenderMessageSource`, flat `messages` views, render-history snapshot merging and reducer-only transcript reconstruction. The sole public projection is `selectRenderModel` with ordered `turn.items`.
- The selector consumes complete accepted `turnEvents`, grouped across resumed invocations. Diagnostic events no longer drive rendering. Local transport outcomes remain separate from canonical run state, including stopped historical turns.
- The decoder accepts current canonical events in SSE data frames. Removed NDJSON decoding and the custom transport-error object protocol. Unknown protocol versions are rejected by the contracts validator.
- Removed duplicate versioned registry manifests, registry version metadata, numbered playground storage naming and unused persisted timestamps. Registry manifests exist only under `public/r`.
- Registry source is canonical; `registry:sync` generates the playground copy and receipt. Verification checks manifests, source freshness, import/dependency closure and the playground copy.
- Removed old Tailwind directive and binary Bun lockfile detection branches. The installer targets Tailwind CSS 4 and current lockfile formats.
- Aligned the playground with the reviewed core's LangGraph 1.4.17 dependency.

Radix and Base UI remain current primitive choices. App-owned provider adapters, attachment capabilities and opaque approval inputs remain supported. Canonical event protocol versioning is preserved.

## Correctness and standards

- Clone accepted events so producer mutation cannot alter retained transcript data.
- Preserve readable error details for failed tool results, including structured error objects.
- Wake and release superseded quiet stream consumers; stale or already-aborted requests cannot overwrite the active consumer's transport state.
- Aborted or disposed React actions return an unsuccessful result. Test adapter replacement, store replacement, subscriptions, server snapshots and unmount cleanup in a DOM environment.
- Replace installer `any` declarations and unchecked external JSON casts with typed validation of packages, component configuration, registry files and receipts.
- Reject malformed JSONC roots, unterminated comments, corrupt registries, duplicate targets, malformed upload metadata and invalid health responses before using them.
- Share content normalization, simplify conditional control flow, remove unreachable work and perform one render projection per store update.
- Clear package output before building so removed files cannot remain in distributed artifacts.
- Add repository code standards, formatting checks, unused-code checks, generated-source verification, public package-surface tests and per-file coverage gates to `yarn ci`.

## Verification

`yarn ci` passed: formatting, all workspace typechecks, registry verification, coverage gates, tests, public package surface, and production builds for both the playground and review app.

244 tests passed, with no skips:

| Area                            | Tests |
| ------------------------------- | ----: |
| UI-core                         |   107 |
| Headless React runtime          |    28 |
| Playground, adapters and server |    84 |
| Installer and package surface   |    25 |

Coverage includes executable runtime modules; type-only files and barrel exports are excluded. Package-surface tests verify the barrel exports separately. These percentages do not represent all editable registry presentation code.

| Runtime        | Statements | Branches | Functions | Lines |
| -------------- | ---------: | -------: | --------: | ----: |
| UI-core        |       100% |   97.63% |      100% |  100% |
| Headless React |       100% |   95.14% |      100% |  100% |

Per-file gates require UI-core ≥98% statements/lines, ≥93% branches and 100% functions; React requires 100% statements/lines/functions and ≥93% branches.

`yarn fixture:verify` passed against disposable Vite/Radix and Next.js/Base UI apps. Each consumed the packed local runtime, installed 33 current component files, typechecked and built successfully. Dry runs were read-only; repeat installs preserved edits with zero repeated source writes or dependency installs. Temporary consumer projects and tarballs were removed.

`yarn check --integrity --ignore-scripts` and `git diff --check` passed.

## Intentional API removals

Custom consumers must use `renderModel.turns[].items` and supply complete grouped `turnEvents` to `selectRenderModel`. Styled components come from the editable registry. The old flat selectors, snapshot message fields, styled runtime imports, NDJSON input and versioned registry paths are unavailable. No compatibility adapters or migration branches were retained.

Live provider calls were not part of these deterministic checks; applications continue to own credentials and backend configuration.
