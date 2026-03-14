import crypto from 'node:crypto'
import type { ScaffoldOptions } from './prompts.js'

export function getDefaultOptions(projectName: string): ScaffoldOptions {
  return {
    projectName,
    appKey: crypto.randomBytes(32).toString('hex'),
    indexerUrl: 'https://sia.storage',
    appDescription: 'A Sia storage app',
  }
}
