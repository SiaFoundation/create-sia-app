import { detectPrivateRelay } from '@siafoundation/sia-storage'
import { useEffect, useState } from 'react'

/**
 * A warning for Safari visitors on iCloud Private Relay, which the SDK cannot
 * connect through. Other browsers never show it and make no request for it.
 */
export function PrivateRelayNotice() {
  const [relay, setRelay] = useState(false)

  useEffect(() => {
    let cancelled = false
    detectPrivateRelay().then((on) => {
      if (!cancelled) setRelay(on)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!relay) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-6">
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      >
        iCloud Private Relay is on, and Sia does not work through it. Turn it
        off in your iCloud settings, then reload this page.
      </div>
    </div>
  )
}
