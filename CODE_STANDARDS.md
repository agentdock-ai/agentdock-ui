# Code standards

- Keep one current public API, event format, transcript projection and canonical component source. Remove obsolete implementations and update callers together; do not add compatibility aliases or reconstruction paths.
- Keep the runtime headless. Editable presentation belongs in the registry; application adapters own requests, authentication, uploads, persistence and backend setup.
- Validate external JSON before using it. Use precise types and discriminated unions; avoid `any`, unchecked casts and inferred action semantics.
- Keep modules focused, prefer explicit control flow and share behavior only where it removes actual duplication.
- Preserve canonical run lifecycle separately from local transport outcomes. Cancellation and cleanup must release consumers promptly, including uncooperative sources.
- Copy playground components using `yarn registry:sync`. Build manifests using `yarn registry:build`; verify both with `yarn registry:verify`. Radix and Base UI are current host choices.
- Builds must clear emitted files so removed APIs cannot survive in package artifacts.
- Cover transcript ordering, content reconciliation, interruptions, streaming ownership, cancellation, React lifecycle and installer validation with behavioral tests.
- Run `yarn ci`, `yarn test:coverage` and the isolated consumer fixtures before release. Keep formatting, unused-code checks, coverage gates and generated-source checks passing.
