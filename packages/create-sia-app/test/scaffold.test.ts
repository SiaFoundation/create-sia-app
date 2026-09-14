import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { validateAppKey, validateProjectName } from '../src/prompts.js'
import {
  copyDir,
  escapeSingleQuoted,
  linkAgentGuides,
} from '../src/scaffold.js'

let tmp: string

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-sia-app-test-'))
})

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true })
})

function write(file: string, content: string | Uint8Array) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

describe('escapeSingleQuoted', () => {
  test.each([
    "Alex's photos",
    'C:\\Users\\alex',
    'a trailing backslash \\',
    "\\'already escaped\\'",
    'https://sia.storage',
  ])('%p reads back unchanged from a single-quoted string', (input) => {
    const source = `return '${escapeSingleQuoted(input)}'`
    expect(new Function(source)()).toBe(input)
  })
})

describe('validateProjectName', () => {
  test('accepts letters, numbers, dashes, dots, and underscores', () => {
    expect(validateProjectName('my-app.v2_1')).toBeUndefined()
  })

  test.each([undefined, '', '   '])('rejects an empty name (%p)', (value) => {
    expect(validateProjectName(value)).toBe('Project name is required')
  })

  test.each(['my app', "alex's", 'app/../x', 'app;rm'])(
    'rejects %p',
    (value) => {
      expect(validateProjectName(value)).toBeString()
    },
  )
})

describe('validateAppKey', () => {
  const key = 'ab'.repeat(32)

  test('accepts 64 hex characters, ignoring surrounding whitespace', () => {
    expect(validateAppKey(key)).toBeUndefined()
    expect(validateAppKey(`  ${key.toUpperCase()}  `)).toBeUndefined()
  })

  test.each([undefined, '', key.slice(1), `${key}a`, `${key.slice(1)}g`])(
    'rejects %p',
    (value) => {
      expect(validateAppKey(value)).toBe(
        'App key must be a 64-character hex string',
      )
    },
  )
})

describe('copyDir', () => {
  test('substitutes every occurrence of each placeholder and renames _gitignore', () => {
    const src = path.join(tmp, 'template')
    const dest = path.join(tmp, 'app')
    write(
      path.join(src, 'src/constants.ts'),
      "export const URL = '{{INDEXER_URL}}'\nexport const SERVICE = '{{INDEXER_URL}}'\n",
    )
    write(path.join(src, '_gitignore'), 'node_modules\n')

    copyDir(src, dest, [['{{INDEXER_URL}}', 'https://sia.storage']])

    expect(fs.readFileSync(path.join(dest, 'src/constants.ts'), 'utf-8')).toBe(
      "export const URL = 'https://sia.storage'\nexport const SERVICE = 'https://sia.storage'\n",
    )
    expect(fs.existsSync(path.join(dest, '.gitignore'))).toBeTrue()
    expect(fs.existsSync(path.join(dest, '_gitignore'))).toBeFalse()
  })

  test('skips node_modules, dist, .git, and CLAUDE.md', () => {
    const src = path.join(tmp, 'template')
    const dest = path.join(tmp, 'app')
    write(path.join(src, 'AGENTS.md'), '# guide\n')
    write(path.join(src, 'CLAUDE.md'), '# stale copy\n')
    write(path.join(src, 'node_modules/pkg/index.js'), '')
    write(path.join(src, 'dist/index.html'), '')
    write(path.join(src, '.git/HEAD'), '')

    copyDir(src, dest, [])

    expect(fs.readdirSync(dest).sort()).toEqual(['AGENTS.md'])
  })

  test('copies binary files byte for byte', () => {
    const src = path.join(tmp, 'template')
    const dest = path.join(tmp, 'app')
    // 0xff 0xfe is not valid UTF-8, so a text round trip would change it.
    const bytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0xff, 0xfe, 0x7b, 0x7b,
    ])
    write(path.join(src, 'module.wasm'), bytes)

    copyDir(src, dest, [['{{', 'x']])

    expect(
      new Uint8Array(fs.readFileSync(path.join(dest, 'module.wasm'))),
    ).toEqual(bytes)
  })
})

describe('linkAgentGuides', () => {
  test('creates CLAUDE.md as a relative symlink to AGENTS.md', () => {
    write(path.join(tmp, 'AGENTS.md'), '# guide\n')

    linkAgentGuides(tmp)

    const claude = path.join(tmp, 'CLAUDE.md')
    expect(fs.lstatSync(claude).isSymbolicLink()).toBeTrue()
    expect(fs.readlinkSync(claude)).toBe('AGENTS.md')
  })

  test('copies AGENTS.md to CLAUDE.md when symlinks are not allowed', () => {
    write(path.join(tmp, 'AGENTS.md'), '# guide\n')
    const symlink = spyOn(fs, 'symlinkSync').mockImplementation(() => {
      throw Object.assign(new Error('EPERM: operation not permitted'), {
        code: 'EPERM',
      })
    })

    try {
      linkAgentGuides(tmp)
    } finally {
      symlink.mockRestore()
    }

    const claude = path.join(tmp, 'CLAUDE.md')
    expect(fs.lstatSync(claude).isFile()).toBeTrue()
    expect(fs.readFileSync(claude, 'utf-8')).toBe('# guide\n')
  })
})
