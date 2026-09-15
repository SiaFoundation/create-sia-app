import { useState } from 'react'

import { DEFAULT_INDEXER_URL } from '../../lib/constants'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../Button'
import { DevNote } from '../DevNote'
import { ErrorAlert } from '../ErrorAlert'
import { AuthCard } from './AuthCard'

export function ConnectScreen() {
  const indexerUrl = useAuthStore((s) => s.indexerUrl)
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)
  const connect = useAuthStore((s) => s.connect)
  const [url, setUrl] = useState(indexerUrl || DEFAULT_INDEXER_URL)

  return (
    <AuthCard
      title="Connect to Sia"
      description="Enter the address of the indexer that will coordinate your storage. Keep the default unless you run your own."
    >
      <DevNote title="Indexer and app ID">
        <p>
          The indexer tracks which hosts hold your encrypted data, pays them,
          and repairs it. It only ever sees ciphertext. Your app ID (in{' '}
          <code>src/lib/constants.ts</code>) identifies this app to it.
        </p>
        <p className="mt-1">
          If the connection fails with a CORS error, the indexer must allow
          requests from this app&apos;s origin.
        </p>
      </DevNote>

      <div className="space-y-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={DEFAULT_INDEXER_URL}
          className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-green-600"
        />
        <Button onClick={() => connect(url)} disabled={busy || !url}>
          {busy ? 'Connecting...' : 'Connect'}
        </Button>
        {error && <ErrorAlert>{error}</ErrorAlert>}
      </div>
    </AuthCard>
  )
}
