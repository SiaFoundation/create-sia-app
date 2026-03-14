#!/usr/bin/env bun
/**
 * Publish create-sia-app to npm.
 *
 * Usage:
 *   bun run publish              # build and publish
 *   bun run publish -- --dry-run # do everything except the actual npm publish
 *
 * Requirements:
 *   - NPM_TOKEN in .env (or exported in environment)
 */

import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { $ } from 'bun'

const ROOT = join(import.meta.dir, '..')
const PKG_DIR = join(ROOT, 'packages', 'create-sia-app')

// Load .env if present
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/)
    if (match) {
      process.env[match[1]] = match[2]
    }
  }
}

const NPM_TOKEN = process.env.NPM_TOKEN
if (!NPM_TOKEN) {
  console.error('ERROR: NPM_TOKEN not found in .env or environment')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf-8'))
const version = pkg.version
console.log(`Publishing create-sia-app@${version}${dryRun ? ' (dry run)' : ''}`)

// Write temporary .npmrc for auth
const npmrcPath = join(ROOT, '.npmrc')
writeFileSync(npmrcPath, `//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n`)

try {
  // Build (compiles CLI + copies template)
  console.log('\n── Building ──')
  await $`bun run build`.cwd(PKG_DIR)

  // Publish
  console.log(`\n── Publishing create-sia-app@${version} ──`)
  if (dryRun) {
    console.log('DRY RUN: would publish from', PKG_DIR)
  } else {
    const result = await $`npm publish --access public`.cwd(PKG_DIR).nothrow()
    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString()
      if (stderr.includes('EPUBLISHCONFLICT') || stderr.includes('cannot publish over')) {
        console.log('Already published, skipping.')
      } else {
        console.error('FAILED:', stderr)
        process.exit(1)
      }
    } else {
      console.log('✓ Published')
    }
  }

  console.log('\n✓ Done!')
} finally {
  rmSync(npmrcPath, { force: true })
}
