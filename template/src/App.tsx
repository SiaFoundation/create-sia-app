import { useEffect } from 'react'

import { Navbar } from './components/Navbar'
import { Toasts } from './components/Toasts'
import { useShareLink } from './hooks/useShareLink'
import { HomePage } from './pages/HomePage'
import { SharePage } from './pages/SharePage'
import { useAuthStore } from './stores/auth'
import { useSharesStore } from './stores/shares'

export default function App() {
  const shareLink = useShareLink()
  const sdk = useAuthStore((s) => s.sdk)
  const reconnect = useAuthStore((s) => s.reconnect)
  const loadShares = useSharesStore((s) => s.load)

  // Both run on every page: a share page shows whether it is the user's own.
  useEffect(() => {
    reconnect()
  }, [reconnect])

  useEffect(() => {
    if (sdk) loadShares(sdk)
  }, [sdk, loadShares])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col">
        {shareLink ? <SharePage link={shareLink} /> : <HomePage />}
      </div>
      <Toasts />
    </div>
  )
}
