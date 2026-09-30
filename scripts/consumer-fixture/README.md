# Consumer verification

```sh
yarn build:packages
yarn registry:build
yarn cli:build
yarn fixture:verify
```

The verifier creates disposable clean Vite/Radix and Next.js/Base UI apps, packs the local public packages, runs the real installer, typechecks copied source and builds each framework. Repeated installation must preserve consumer edits with zero source rewrites or duplicate dependency installation. Dry run must leave the project unchanged.

Packages are consumed through their exported, packed `dist` artifacts. Local contract/core tarball overrides make verification independent of unpublished runtime changes. Network access is required to install framework dependencies. Results are written to `.generated/latest-results.json`; generated projects are ignored by Git.
