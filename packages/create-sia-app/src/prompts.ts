import crypto from 'node:crypto'

import * as p from '@clack/prompts'
import pc from 'picocolors'

export type ScaffoldOptions = {
  projectName: string
  appId: string
  indexerUrl: string
  appDescription: string
}

// clack types isCancel as narrowing to its own unique symbol, which leaves
// `symbol` in a prompt's `string | symbol` result. This guard removes it.
function isCancelled(value: unknown): value is symbol {
  return p.isCancel(value)
}

export function validateProjectName(value: string | undefined) {
  const name = value?.trim() ?? ''
  if (!name) return 'Project name is required'
  if (!/^[a-z0-9._-]+$/i.test(name))
    return 'Use only letters, numbers, dashes, dots, and underscores'
  return undefined
}

export function validateAppId(value: string | undefined) {
  if (!/^[a-f0-9]{64}$/i.test(value?.trim() ?? ''))
    return 'App ID must be a 64-character hex string'
  return undefined
}

export async function runPrompts(): Promise<ScaffoldOptions | null> {
  p.intro(pc.green('Create Sia App'))

  const projectName = await p.text({
    message: 'What is your project name?',
    placeholder: 'my-sia-app',
    validate: validateProjectName,
  })

  if (isCancelled(projectName)) {
    p.cancel('Cancelled.')
    return null
  }

  const keyChoice = await p.select({
    message: 'App ID',
    options: [
      {
        value: 'generate',
        label: 'Generate a new app ID',
        hint: 'Recommended',
      },
      { value: 'existing', label: 'Enter an existing app ID' },
    ],
  })

  if (isCancelled(keyChoice)) {
    p.cancel('Cancelled.')
    return null
  }

  let appId: string

  if (keyChoice === 'existing') {
    const existingId = await p.text({
      message: 'Enter your app ID (64-char hex)',
      validate: validateAppId,
    })

    if (isCancelled(existingId)) {
      p.cancel('Cancelled.')
      return null
    }

    appId = existingId.trim()
  } else {
    appId = crypto.randomBytes(32).toString('hex')
    p.log.info(`Generated app ID: ${pc.cyan(appId)}`)
  }

  const indexerUrl = await p.text({
    message: 'Indexer URL',
    initialValue: 'https://sia.storage',
  })

  if (isCancelled(indexerUrl)) {
    p.cancel('Cancelled.')
    return null
  }

  const appDescription = await p.text({
    message: 'App description (optional)',
    placeholder: 'My decentralized storage app',
    defaultValue: 'A Sia storage app',
  })

  if (isCancelled(appDescription)) {
    p.cancel('Cancelled.')
    return null
  }

  return {
    projectName: projectName.trim(),
    appId,
    indexerUrl: indexerUrl.trim(),
    appDescription: appDescription.trim() || 'A Sia storage app',
  }
}
