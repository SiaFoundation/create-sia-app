---
default: minor
---

New apps use oxlint and oxfmt instead of Biome. `bun run check` runs the format check, lint, and typecheck, and `bun run fmt` fixes formatting. The upload reference component loads files with a cancellable effect and reads downloads through a small helper, which the new React lint rules require.
