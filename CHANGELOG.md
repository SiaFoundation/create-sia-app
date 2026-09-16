# Changelog
## 0.1.20 (2026-09-16)

### Features

- The CLI asks for an app ID instead of an app key, and new apps name the constant `APP_ID`. New apps also report their own origin to the indexer as the service URL; they previously sent the indexer's URL.
- The connection flow in new apps recovers from errors. A denied or expired request and a failed approval check show the reason with buttons to request a new link or go back. Connection and registration errors appear on the screen that caused them, with a clear message when the account has used all of its app connections. A returning user whose reconnect fails gets a retry instead of being sent through a new approval, and an approval that arrives for an abandoned request no longer moves the flow forward.
- The connection flow in new apps is one state machine in the auth store, with the screens rendering its state. A returning user whose reconnect fails can reload or start over, a saved key the indexer rejects is forgotten, a failed WASM load says to reload, and the app's own address is sent as the service URL.
- New apps ship one Playwright smoke test and a single-project config. The thorough connection flow tests moved into this repo, where CI runs them inside a freshly scaffolded app on both the production build and the dev server.
- `create-sia-app` requires Node.js 22.12 or newer, the same minimum as Vite 8.
- New apps skip package versions published in the last three days, fail loudly when the dev or preview port is taken, and run Playwright with no retries, `test.only` refused in CI, and traces kept for failures. `bun run e2e` runs the smoke test.
- New apps use oxlint and oxfmt instead of Biome. `bun run check` runs the format check, lint, and typecheck, and `bun run fmt` fixes formatting. The upload reference component loads files with a cancellable effect and reads downloads through a small helper, which the new React lint rules require.
- New apps can share files publicly. Each file has a Share button that creates a link anyone can open without an account, copies it, or stops sharing. A share link opens its own page with the shared files, and links opened in the app are listed under Shared with you on the home page, for signed-out visitors too.
- When an account that has used the app before connects again, new apps ask for its existing recovery phrase first, and a phrase that does not match asks for confirmation before creating a second, empty account.
- New apps type check with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, and `noImplicitOverride` turned on.
- New apps use TypeScript 7, Vite 8, React 19.3, Tailwind CSS 4.3, and Playwright 1.63, with every dependency pinned to an exact version.

### Fixes

- New apps get both `AGENTS.md` and a `CLAUDE.md` symlink to it. Apps created from the published package previously had only `CLAUDE.md`.
- An app description or indexer URL containing an apostrophe or backslash no longer produces a syntax error in the generated `src/lib/constants.ts`.
- New apps use `@siafoundation/sia-storage` 0.1.0. The agent guide's share URL example uses the renamed `objectShareUrl` and `objectFromShareUrl`.
- New apps include a favicon.

## 0.1.19 (2026-09-09)

### Fixes

- Scaffolded apps no longer pass `maxInflight` to uploads and downloads. The storage SDK removed that option and now adapts transfer concurrency to network conditions on its own.
- Bump @siafoundation/sia-storage to 0.0.14

## 0.1.18 (2026-05-01)

### Fixes

- Add repository metadata to package.json so npm publishes can verify provenance.

## 0.1.17 (2026-04-29)

### Fixes

- Bump @siafoundation/sia-storage to 0.0.9
