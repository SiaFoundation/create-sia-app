import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as p from '@clack/prompts'
import pc from 'picocolors'

import type { ScaffoldOptions } from './prompts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])
const BINARY_EXTENSIONS = new Set(['.wasm', '.png', '.jpg', '.ico', '.svg'])

function findTemplateDir(): string {
  // When published: template/ is bundled alongside dist/
  const published = path.resolve(__dirname, '..', 'template')
  if (fs.existsSync(published)) return published

  // When developing locally in the monorepo
  const local = path.resolve(__dirname, '..', '..', '..', 'template')
  if (fs.existsSync(local)) return local

  throw new Error('Could not find template directory')
}

function copyDir(src: string, dest: string, replacements: [string, string][]) {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    // What reaches the published template in place of the CLAUDE.md symlink
    // depends on the build machine: macOS `cp -r` copies it as a regular
    // file, GNU cp keeps the link and npm then drops it from the tarball.
    // Skipping it here and letting linkAgentGuides create it gives the same
    // result either way.
    if (AGENT_GUIDE_LINKS.includes(entry.name)) continue

    const srcPath = path.join(src, entry.name)
    let destName = entry.name

    // Rename _gitignore to .gitignore
    if (destName === '_gitignore') destName = '.gitignore'

    const destPath = path.join(dest, destName)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, replacements)
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (BINARY_EXTENSIONS.has(ext)) {
        fs.copyFileSync(srcPath, destPath)
      } else {
        let content = fs.readFileSync(srcPath, 'utf-8')
        for (const [search, replace] of replacements) {
          content = content.replaceAll(search, replace)
        }
        fs.writeFileSync(destPath, content)
      }
    }
  }
}

// Agent guides that point at AGENTS.md. Windows refuses to create symlinks
// without developer mode, so a copy is the fallback.
const AGENT_GUIDE_LINKS = ['CLAUDE.md']

function linkAgentGuides(dest: string) {
  for (const name of AGENT_GUIDE_LINKS) {
    const linkPath = path.join(dest, name)
    try {
      fs.symlinkSync('AGENTS.md', linkPath)
    } catch {
      fs.copyFileSync(path.join(dest, 'AGENTS.md'), linkPath)
    }
  }
}

function detectPackageManager(): 'bun' | 'npm' {
  try {
    execSync('bun --version', { stdio: 'ignore' })
    return 'bun'
  } catch {
    return 'npm'
  }
}

export async function scaffold(options: ScaffoldOptions) {
  const { projectName, appKey, indexerUrl, appDescription } = options
  const targetDir = path.resolve(process.cwd(), projectName)

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir)
    if (entries.length > 0) {
      p.log.error(
        `Directory ${pc.red(projectName)} already exists and is not empty.`,
      )
      process.exit(1)
    }
  }

  const spinner = p.spinner()
  spinner.start('Creating project...')

  const templateDir = findTemplateDir()

  const replacements: [string, string][] = [
    ['{{APP_NAME}}', projectName],
    ['{{APP_KEY}}', appKey],
    ['{{INDEXER_URL}}', indexerUrl],
    ['{{APP_DESCRIPTION}}', appDescription],
  ]

  copyDir(templateDir, targetDir, replacements)
  linkAgentGuides(targetDir)
  spinner.message('Copied template files')

  const pm = detectPackageManager()
  spinner.message(`Installing dependencies with ${pm}...`)

  try {
    execSync(`${pm} install`, { cwd: targetDir, stdio: 'ignore' })
    spinner.stop('Project created successfully')
  } catch {
    spinner.stop('Project created (install failed — run manually)')
  }

  p.note(
    [
      `${pc.green('cd')} ${projectName}`,
      `${pc.green(pm === 'bun' ? 'bun dev' : 'npm run dev')}`,
    ].join('\n'),
    'Next steps',
  )

  p.outro(pc.green('Happy building!'))
}
