import { useMemo, useSyncExternalStore } from 'react'

import { readShareLink } from '../lib/shareLink'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** The share link in the address bar, or null on the home page. */
export function useShareLink() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  // One object per hash, so effects that depend on the link run once per link.
  return useMemo(() => readShareLink(hash), [hash])
}
