// A share link is this app's own address with the sharing key's seed and the
// indexer in the fragment: `https://app.example/#share=<seed>&indexer=<url>`.
// Browsers never send the fragment to a server. The link is also the share
// page's URL, so it stays in the address bar and browser history, and anyone
// with that history can read the share.

export type ShareLink = {
  seed: string
  indexerUrl: string
}

export function shareLinkUrl({ seed, indexerUrl }: ShareLink) {
  const params = new URLSearchParams({ share: seed, indexer: indexerUrl })
  return `${window.location.origin}${window.location.pathname}#${params}`
}

export function readShareLink(hash: string): ShareLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const seed = params.get('share')
  const indexerUrl = params.get('indexer')
  if (!seed || !/^[0-9a-f]{64}$/i.test(seed) || !indexerUrl) return null
  return { seed: seed.toLowerCase(), indexerUrl }
}
