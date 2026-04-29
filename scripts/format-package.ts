#!/usr/bin/env bun
// Normalize packages/create-sia-app/package.json formatting after Knope's
// PrepareRelease step rewrites it. Knope's writer can drop the trailing
// newline, which biome and editors both flag.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pkgPath = join(
  import.meta.dir,
  '..',
  'packages',
  'create-sia-app',
  'package.json',
)
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
