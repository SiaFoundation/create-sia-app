# Template tests

Playwright tests for the connection flow and share links of the app in
`template/`. They run
against a fake indexer served through Playwright's network interception, so
they need no account and nobody clicking approve.

They are not shipped to users. `scripts/test-scaffold.ts` copies these files
into a freshly scaffolded app, replacing its Playwright config, and runs them
there. That config runs every test twice: on the production build, which is
what users deploy, and on the Vite dev server, where React StrictMode runs
effects twice and a repeated SDK call would show up.

To run them by hand, scaffold an app, copy the spec files and `fake-indexer.ts`
into its `e2e/` and `playwright.config.ts` over its own, then `bun run e2e`
there. Or run `bun run test:scaffold --keep` from the repo root.
