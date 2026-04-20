import type { AppMetadata } from 'sia-storage'

// biome-ignore format: scaffolder substitutes a 64-char hex string here
export const APP_KEY = '{{APP_KEY}}'
export const APP_NAME = '{{APP_NAME}}'
export const DEFAULT_INDEXER_URL = '{{INDEXER_URL}}'
export const APP_META: AppMetadata = {
  appId: APP_KEY,
  name: APP_NAME,
  description: '{{APP_DESCRIPTION}}',
  serviceUrl: '{{INDEXER_URL}}',
  logoUrl: undefined,
  callbackUrl: undefined,
}

// Erasure coding parameters — passed to sdk.upload() and encodedSize().
export const DATA_SHARDS = 10
export const PARITY_SHARDS = 20
