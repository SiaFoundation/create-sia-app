import { useState } from 'react'

import { errorMessage, requestConnection } from '../../lib/connection'
import { useAuthStore } from '../../stores/auth'
import { CopyButton } from '../CopyButton'
import { DevNote } from '../DevNote'

export function ApproveScreen() {
  const builder = useAuthStore((s) => s.builder)
  const approvalUrl = useAuthStore((s) => s.approvalUrl)
  const approvalError = useAuthStore((s) => s.approvalError)
  const indexerUrl = useAuthStore((s) => s.indexerUrl)
  const startApproval = useAuthStore((s) => s.startApproval)
  const startOver = useAuthStore((s) => s.startOver)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  const error = requestError ?? approvalError

  async function handleNewLink() {
    setRequesting(true)
    setRequestError(null)
    try {
      const next = await requestConnection(indexerUrl)
      if (useAuthStore.getState().builder === builder) startApproval(next)
    } catch (e) {
      setRequestError(`Could not request a new link: ${errorMessage(e)}.`)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Approve Connection
          </h1>
          <p className="text-neutral-600 text-sm">
            Open the link below to approve this app, then return here.
          </p>
        </div>

        <DevNote title="Out-of-Band Approval">
          <p>
            The user must visit the approval URL in another tab (or on the
            indexer&apos;s dashboard) to authorize your app. This is an
            out-of-band step — your app polls for approval via{' '}
            <code className="text-amber-700">builder.waitForApproval()</code>.
            If the request is denied or polling fails, that Builder cannot be
            used again, so the app requests a new link.
          </p>
        </DevNote>

        {error ? (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
          >
            {error} Request a new link to try again.
          </div>
        ) : (
          approvalUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-white border border-neutral-300 rounded-lg">
                <span className="flex-1 text-sm font-mono text-neutral-600 truncate">
                  {approvalUrl}
                </span>
                <CopyButton value={approvalUrl} label="URL copied" />
              </div>
              <a
                href={approvalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Open Link
              </a>
            </div>
          )
        )}

        {error && (
          <button
            type="button"
            onClick={handleNewLink}
            disabled={requesting}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-medium rounded-lg transition-colors"
          >
            {requesting ? 'Requesting...' : 'Request new link'}
          </button>
        )}

        {!error && (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600" />
            </span>
            Polling for approval...
          </div>
        )}

        <button
          type="button"
          onClick={startOver}
          className="w-full py-2 text-neutral-500 hover:text-neutral-900 text-sm transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  )
}
