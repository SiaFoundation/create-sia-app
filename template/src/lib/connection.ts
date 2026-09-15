import { Builder } from '@siafoundation/sia-storage'

import { APP_META } from './constants'

/** Starts a connection request and returns the Builder waiting on it. */
export async function requestConnection(indexerUrl: string) {
  const builder = new Builder(indexerUrl, APP_META)
  await builder.requestConnection()
  return builder
}

// SDK messages can end in whitespace or a period, and callers append their own.
export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\s.]+$/, '')
}

export function describeApprovalError(error: unknown) {
  const message = errorMessage(error)
  // The indexer deletes a denied request and answers status checks for it with
  // the same 404 it uses for an expired one, and the SDK reports both as
  // "user rejected connection request".
  if (message.includes('user rejected')) {
    return 'The connection request was denied or has expired.'
  }
  return `Stopped waiting for approval: ${message}.`
}

export function describeRegisterError(error: unknown) {
  const message = errorMessage(error)
  // The indexer's error when the account's connect key has no app slots left.
  if (message.includes('key has no remaining uses')) {
    return 'Registration failed: this account has used all of its app connections. Remove an app from the account or upgrade its plan.'
  }
  return `Registration failed: ${message}.`
}
