import type { AppMetadata } from '@siafoundation/sia-storage'

// Identifies this app to the indexer. Objects are stored per app, so changing
// it hides everything uploaded under the old one.
export const APP_ID = '{{APP_ID}}'
export const APP_NAME = '{{APP_NAME}}'

// Suggested on the connect screen; the user can enter another.
export const DEFAULT_INDEXER_URL = '{{INDEXER_URL}}'

// Shown to the user on the indexer's approval page.
export const APP_META: AppMetadata = {
  appId: APP_ID,
  name: APP_NAME,
  description: '{{APP_DESCRIPTION}}',
  // Where this app lives, not the indexer.
  serviceUrl: window.location.origin,
  logoUrl: undefined,
  callbackUrl: undefined,
}

// Erasure coding: each slab is split into DATA_SHARDS pieces plus
// PARITY_SHARDS redundant ones, so any DATA_SHARDS of them rebuild the slab.
export const DATA_SHARDS = 10
export const PARITY_SHARDS = 20
