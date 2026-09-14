---
default: minor
---

New apps skip package versions published in the last three days, fail loudly when the dev or preview port is taken, and run Playwright with no retries, `test.only` refused in CI, and traces kept for failures. `bun run e2e` runs the smoke test.
