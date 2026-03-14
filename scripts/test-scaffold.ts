#!/usr/bin/env bun
/**
 * Smoke-test the full scaffold flow end-to-end: build the CLI, run it against
 * a temp dir, then type-check, lint, and build the scaffolded project.
 *
 *   bun run scripts/test-scaffold.ts
 *   bun run scripts/test-scaffold.ts --keep         # leave the temp scaffold in place
 *   bun run scripts/test-scaffold.ts --skip-build   # reuse existing dist/
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { $ } from 'bun'

const ROOT = join(import.meta.dir, '..')
const CLI_DIR = join(ROOT, 'packages', 'create-sia-app')
const CLI_BIN = join(CLI_DIR, 'dist', 'index.js')

const KEEP = process.argv.includes('--keep')
const SKIP_BUILD = process.argv.includes('--skip-build')

const SCRATCH = join(tmpdir(), 'create-sia-app-scaffold-test')
const APP_NAME = 'scaffold-smoke-app'
const APP_DIR = join(SCRATCH, APP_NAME)

function fail(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function step(msg: string) {
  console.log(`\n── ${msg} ──`)
}

async function main() {
  if (!SKIP_BUILD) {
    step('Building CLI')
    await $`bun run build`.cwd(CLI_DIR)
  }
  if (!existsSync(CLI_BIN)) {
    fail(`CLI binary missing: ${CLI_BIN}. Run without --skip-build first.`)
  }

  step('Scaffolding')
  rmSync(SCRATCH, { recursive: true, force: true })
  mkdirSync(SCRATCH, { recursive: true })
  // The CLI takes the name as a positional arg and uses default options
  // (random app key, default indexer, default description) when given one.
  execFileSync('node', [CLI_BIN, APP_NAME], { cwd: SCRATCH, stdio: 'inherit' })

  step('Checking placeholder substitution')
  const pkg = JSON.parse(readFileSync(join(APP_DIR, 'package.json'), 'utf-8'))
  if (pkg.name !== APP_NAME) fail(`package.json name is "${pkg.name}", expected "${APP_NAME}"`)
  const constants = readFileSync(join(APP_DIR, 'src/lib/constants.ts'), 'utf-8')
  if (constants.includes('{{')) fail(`constants.ts still contains placeholders`)

  step('Type-checking scaffolded project')
  await $`bun x tsc -b`.cwd(APP_DIR)

  step('Linting scaffolded project')
  await $`bun run check`.cwd(APP_DIR)

  step('Building scaffolded project')
  await $`bun run build`.cwd(APP_DIR)
  const assets = readdirSync(join(APP_DIR, 'dist/assets'))
  if (!assets.some((f) => f.endsWith('.wasm'))) {
    fail(`Vite build produced no .wasm asset in dist/assets/:\n${assets.join('\n')}`)
  }

  step('Done')
  console.log(`✓ Scaffold smoke test passed (artifacts at ${APP_DIR})`)

  if (!KEEP) {
    rmSync(SCRATCH, { recursive: true, force: true })
  } else {
    console.log(`  --keep set, leaving ${SCRATCH} in place`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
