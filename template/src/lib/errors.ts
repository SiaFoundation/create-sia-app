// Turns SDK and indexer failures into sentences for the connection screens.
// Where the SDK's own message names the HTTP or CORS problem, it stays at the
// end of the sentence, which is what a developer needs while setting up.

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
    return 'The connection request was denied or has expired.'
  }
  return `Lost contact with the indexer while waiting for approval. ${message}.`
}

export function describeRegisterError(error: unknown) {
  const message = errorMessage(error)
  if (message.includes('key has no remaining uses')) {
    return "This account has reached its limit of connected apps. Remove one on the indexer's site, then start over."
  }
  return `Could not finish setting up the account. ${message}.`
}
