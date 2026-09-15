// Turns SDK and indexer failures into sentences for the connection screens.
// The SDK's own message stays at the end of each one: it names the HTTP or
// CORS problem, which is what a developer needs while setting up.

export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\s.]+$/, '')
}

export function describeApprovalError(error: unknown) {
  const message = errorMessage(error)
  // The indexer deletes a denied request and then answers status checks with
  // the same 404 as for an expired one, so the SDK reports both as rejected.
  // The SDK also stops on its own once the request's expiry has passed.
  if (
    message.includes('user rejected') ||
    message.includes('request expired')
  ) {
    return 'The approval link was denied or has expired.'
  }
  return `Lost contact with the indexer while waiting for approval. ${message}.`
}

export function describeRegisterError(error: unknown) {
  const message = errorMessage(error)
  // The indexer's error when the account has no app connections left.
  if (message.includes('key has no remaining uses')) {
    return 'This account has no app connections left. Remove an app from the account on the indexer, or upgrade its plan, then start over.'
  }
  return `Could not finish setting up the account. ${message}.`
}
