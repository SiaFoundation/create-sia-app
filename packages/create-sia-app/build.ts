// Bundles the CLI into dist/ and copies the template next to it, which is the
// layout `files` in package.json publishes. Plain file APIs rather than a shell
// pipeline, because bun's shell on Windows has no `cp -r`.
import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const here = import.meta.dir
const source = join(here, '..', '..', 'template')
const target = join(here, 'template')
const skip = new Set([
  'node_modules',
  'dist',
  'test-results',
  'playwright-report',
])

rmSync(join(here, 'dist'), { recursive: true, force: true })
const result = await Bun.build({
  entrypoints: [join(here, 'src', 'index.ts')],
  outdir: join(here, 'dist'),
  target: 'node',
  format: 'esm',
  packages: 'external',
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
cpSync(source, target, {
  recursive: true,
  filter: (path) => !skip.has(path.split(/[\\/]/).at(-1) ?? ''),
})
