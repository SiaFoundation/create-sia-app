import { useState } from 'react'

import { errorMessage, requestConnection } from '../../lib/connection'
import { DEFAULT_INDEXER_URL } from '../../lib/constants'
import { useAuthStore } from '../../stores/auth'
import { DevNote } from '../DevNote'

export function ConnectScreen() {
  const indexerUrl = useAuthStore((s) => s.indexerUrl)
  const setIndexerUrl = useAuthStore((s) => s.setIndexerUrl)
  const startApproval = useAuthStore((s) => s.startApproval)
  const [url, setUrl] = useState(indexerUrl || DEFAULT_INDEXER_URL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const builder = await requestConnection(url)
      setIndexerUrl(url)
      startApproval(builder)
    } catch (e) {
      setError(
        `Connection failed: ${errorMessage(e)}. Check the indexer URL and that it allows requests from this origin (CORS).`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Connect to Indexer
          </h1>
          <p className="text-neutral-600 text-sm">
            Enter your Sia indexer URL to get started
          </p>
        </div>

        <DevNote title="Indexer URL & App Key">
          <p>
            The indexer URL points to your Sia storage provider. The default is{' '}
            <code className="text-amber-700">https://sia.storage</code>. Your
            app key (set in{' '}
            <code className="text-amber-700">src/lib/constants.ts</code>)
            uniquely identifies your app to the indexer.
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
            placeholder="https://sia.storage"
            className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-green-600"
          />

          <button
            type="button"
            onClick={handleConnect}
            disabled={loading || !url}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>

          {error && (
            <p role="alert" className="text-red-600 text-sm">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
