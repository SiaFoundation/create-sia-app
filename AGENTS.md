# Working in create-sia-app

This repo publishes `create-sia-app`, a CLI that copies a starter app for the
[Sia](https://sia.tech) storage network into a new directory. It is a bun
workspace with two members that never import each other:

| Path                      | What it is                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/create-sia-app` | The CLI published to npm: prompts, template copy, install                                        |
| `template/`               | The app the CLI copies. It must build and pass its checks as its own project                     |
| `scripts/`                | Bun scripts for the scaffold smoke test and releases                                             |
| `template-tests/`         | Playwright tests for the template's connection flow, run inside a scaffolded app and not shipped |

## The template is what users get

`template/AGENTS.md` is the guide for people and agents working inside a
generated app. Keep notes about this repo out of it.

The CLI copies every file in `template/` except `node_modules`, `dist`, `.git`,
and `CLAUDE.md`, and makes these changes on the way:

- `{{APP_NAME}}`, `{{APP_ID}}`, `{{INDEXER_URL}}`, and `{{APP_DESCRIPTION}}`
  are replaced in every text file. The indexer URL and description are escaped
  for single-quoted strings, so only place those two inside single quotes.
- `_gitignore` becomes `.gitignore`. npm leaves `.gitignore` files out of the
  published package, so the template cannot ship one under its real name.
- `CLAUDE.md` is created as a symlink to `AGENTS.md`, or a copy where symlinks
  are not allowed. npm also leaves symlinks out of the package.
- After installing dependencies it runs the app's `fmt` script, because a
  substituted value can push a line past the formatter's width.

The template has its own `.oxlintrc.json`, `.oxfmtrc.json`, tsconfig files, and
`bunfig.toml`, and the root configs ignore `template/`. A change that only
works because of something at the repo root will fail the scaffold smoke test,
which installs the packed CLI into an empty directory.

## The CLI

`packages/create-sia-app/dist/index.js` is committed. Rebuild it after changing
`src/` with `bun run --cwd packages/create-sia-app build`, which also copies
`template/` into `packages/create-sia-app/template/` (gitignored) for
publishing. The CLI supports Node.js 22.12 and newer.

## The gate

`bun run check` runs everything below in order. Run it before committing.

| Command                        | What it does                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `bun run fmt`                  | oxfmt, rewrites files                                                                                          |
| `bun run fmt:check`            | oxfmt, reports only                                                                                            |
| `bun run lint`                 | oxlint over the CLI and scripts                                                                                |
| `bun run typecheck`            | TypeScript over `scripts/` and the CLI                                                                         |
| `bun run test`                 | Unit tests for the CLI, `bun test`                                                                             |
| `bun run --cwd template check` | The template's own format check, lint, and typecheck                                                           |
| `bun run --cwd template build` | Production build of the template                                                                               |
| `bun run test:scaffold`        | Packs the CLI, installs the tarball, scaffolds an app, checks and builds it, then runs `template-tests/` in it |

`bun run --cwd template e2e:install` downloads Chromium once per machine.

The template ships one smoke test. The thorough connection flow tests live in
`template-tests/` so users do not inherit them; the scaffold test copies them
into the scaffolded app and runs them there, on both the production build and
the dev server. They cannot run against `template/` because its constants still
hold the `{{APP_ID}}` placeholder, which the SDK rejects. They talk to a fake
indexer in `template-tests/fake-indexer.ts`; when the indexer's auth responses
change, update it to match.

Code style is enforced by oxfmt: no semicolons, single quotes, 2-space indent,
80 columns.

## Dependencies

Every dependency is pinned to an exact version. `bunfig.toml`, at the root and
in the template, refuses package versions published in the last three days,
except `@siafoundation/sia-storage`. When upgrading, pick the newest version
that is at least three days old.

A scheduled workflow bumps `@siafoundation/sia-storage` in
`template/package.json` and adds a changeset.

## Releases

Any change a user of the CLI or a generated app would notice needs a file in
`.changeset/`:

```md
---
default: patch
---

One or two sentences describing the change for the changelog.
```

Use `minor` for new behavior and `patch` for fixes. knope turns these into
`CHANGELOG.md` entries when a release is prepared, so do not edit the changelog
by hand.
