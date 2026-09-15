#!/usr/bin/env bun
/**
 * Smoke-test the full scaffold flow end-to-end: build the CLI, pack it into
 * the same tarball npm would publish, install that tarball, run it against a
 * temp dir, then type-check, lint, and build the scaffolded project.
 *
 * Running the packed tarball rather than the repo checkout matters: npm drops
 * symlinks and anything outside `files` when packing, and a scaffold from the
 * checkout cannot see either loss.
 *
 *   bun run scripts/test-scaffold.ts
 *   bun run scripts/test-scaffold.ts --keep         # leave the temp scaffold in place
 */

import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { $ } from 'bun'

const ROOT = join(import.meta.dir, '..')
const CLI_DIR = join(ROOT, 'packages', 'create-sia-app')

const KEEP = process.argv.includes('--keep')

// On Windows, tmpdir() can be an 8.3 short path (C:\Users\RUNNER~1\...).
// Vite compares request paths against the real path when deciding what it
// may serve, so the dev server refuses the app unless the two match.
const SCRATCH = join(
  realpathSync.native(tmpdir()),
  'create-sia-app-scaffold-test',
)
const INSTALL_DIR = join(SCRATCH, 'cli')
const APP_NAME = 'scaffold-smoke-app'
const APP_DIR = join(SCRATCH, APP_NAME)

function fail(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function step(msg: string) {
  console.log(`\n── ${msg} ──`)
}

function listFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listFiles(path))
    else files.push(path)
  }
  return files
}

async function main() {
  step('Building CLI')
  await $`bun run build`.cwd(CLI_DIR)

  step('Packing and installing CLI tarball')
  rmSync(SCRATCH, { recursive: true, force: true })
  mkdirSync(INSTALL_DIR, { recursive: true })
  const tarball = (
    await $`npm pack --silent --pack-destination ${SCRATCH}`.cwd(CLI_DIR).text()
  )
    .trim()
    .split('\n')
    .at(-1)
  if (!tarball) fail('npm pack printed no tarball name')
  await $`npm init -y`.cwd(INSTALL_DIR).quiet()
  await $`npm install --no-audit --no-fund ${join(SCRATCH, tarball)}`.cwd(
    INSTALL_DIR,
  )
  const cliBin = join(
    INSTALL_DIR,
    'node_modules',
    'create-sia-app',
    'dist',
    'index.js',
  )
  if (!existsSync(cliBin)) fail(`installed CLI binary missing: ${cliBin}`)

  step('Scaffolding')
  // The CLI takes the name as a positional arg and uses default options
  // (random app ID, default indexer, default description) when given one.
  execFileSync('node', [cliBin, APP_NAME], { cwd: SCRATCH, stdio: 'inherit' })

  step('Checking scaffolded files')
  const pkg = JSON.parse(readFileSync(join(APP_DIR, 'package.json'), 'utf-8'))
  if (pkg.name !== APP_NAME)
    fail(`package.json name is "${pkg.name}", expected "${APP_NAME}"`)
  for (const file of listFiles(APP_DIR)) {
    if (file.endsWith('bun.lock') || file.endsWith('package-lock.json'))
      continue
    if (/\{\{[A-Z_]+\}\}/.test(readFileSync(file, 'utf-8'))) {
      fail(`${relative(APP_DIR, file)} still contains a {{placeholder}}`)
    }
  }
  if (!existsSync(join(APP_DIR, '.gitignore'))) fail('.gitignore missing')
  if (existsSync(join(APP_DIR, '_gitignore')))
    fail('_gitignore was not renamed')
  const agents = join(APP_DIR, 'AGENTS.md')
  if (!existsSync(agents) || !lstatSync(agents).isFile())
    fail('AGENTS.md missing')
  const claude = join(APP_DIR, 'CLAUDE.md')
  if (!existsSync(claude)) fail('CLAUDE.md missing')
  if (lstatSync(claude).isSymbolicLink()) {
    if (readlinkSync(claude) !== 'AGENTS.md') {
      fail('CLAUDE.md is a symlink but does not point at AGENTS.md')
    }
  } else if (process.platform !== 'win32') {
    fail('CLAUDE.md is not a symlink to AGENTS.md')
  } else if (readFileSync(claude, 'utf-8') !== readFileSync(agents, 'utf-8')) {
    // Windows without symlink permission gets a copy instead.
    fail('CLAUDE.md is neither a symlink to AGENTS.md nor a copy of it')
  }

  step('Format, lint, and type-check scaffolded project')
  await $`bun run check`.cwd(APP_DIR)

  step('Building scaffolded project')
  await $`bun run build`.cwd(APP_DIR)
  const assets = readdirSync(join(APP_DIR, 'dist/assets'))
  if (!assets.some((f) => f.endsWith('.wasm'))) {
    fail(
      `Vite build produced no .wasm asset in dist/assets/:\n${assets.join('\n')}`,
    )
  }

  // The connection flow tests live in template-tests/ rather than shipping
  // with every app. They need a real app ID, which template/ does not have,
  // so they run here. Their config replaces the app's own.
  step("Running the scaffolded project's own smoke test")
  await $`bun run e2e`.cwd(APP_DIR)

  step('Running the template tests in scaffolded project')
  const suite = join(ROOT, 'template-tests')
  copyFileSync(
    join(suite, 'playwright.config.ts'),
    join(APP_DIR, 'playwright.config.ts'),
  )
  for (const file of ['auth-flow.spec.ts', 'fake-indexer.ts']) {
    copyFileSync(join(suite, file), join(APP_DIR, 'e2e', file))
  }
  await $`bun run e2e`.cwd(APP_DIR)

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
