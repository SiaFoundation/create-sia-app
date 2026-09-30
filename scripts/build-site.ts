// Builds the template as a generated app would be, for the demo site that
// wrangler.jsonc deploys: copies template/ with the CLI's own copy step and
// substitutions, installs, builds, and puts the output in .site/.
//
// template/ cannot be built as it is, because its constants hold the
// {{APP_ID}} placeholder, which the SDK rejects.
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { $ } from 'bun'

import {
  copyDir,
  escapeSingleQuoted,
} from '../packages/create-sia-app/src/scaffold'

const ROOT = join(import.meta.dir, '..')
const OUT = join(ROOT, '.site')

// Fixed, unlike a scaffold's random one. An indexer account that approved the
// demo site keeps its files only while the app ID stays the same.
const APP_ID =
  '89ed8dfce68d33605487eb8f32a3256396eb3747d692f16564c2850fb34e2df5'

const work = mkdtempSync(join(realpathSync.native(tmpdir()), 'sia-app-site-'))
const app = join(work, 'create-sia-app')
try {
  copyDir(join(ROOT, 'template'), app, [
    ['{{APP_NAME}}', 'create-sia-app'],
    ['{{APP_ID}}', APP_ID],
    ['{{INDEXER_URL}}', escapeSingleQuoted('https://sia.storage')],
    [
      '{{APP_DESCRIPTION}}',
      escapeSingleQuoted('The create-sia-app starter template'),
    ],
  ])
  // Outside the repo, so bun installs the app on its own rather than as part
  // of this workspace, the way a user's install goes.
  await $`bun install`.cwd(app)
  await $`bun run build`.cwd(app)
  rmSync(OUT, { recursive: true, force: true })
  cpSync(join(app, 'dist'), OUT, { recursive: true })
  console.log(`Built the demo site into ${OUT}`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
