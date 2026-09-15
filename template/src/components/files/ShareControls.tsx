import type { StoredFile } from '../../lib/files'
import { shareLinkUrl } from '../../lib/shareLink'
import { useAuthStore } from '../../stores/auth'
import { useSharesStore } from '../../stores/shares'
import { useToastStore } from '../../stores/toast'
import { Button } from '../Button'
import { ErrorAlert } from '../ErrorAlert'

/** Creates, copies, or stops the share link for one file. */
export function ShareControls({ file }: { file: StoredFile }) {
  const sdk = useAuthStore((s) => s.sdk)
  const indexerUrl = useAuthStore((s) => s.indexerUrl)
  const share = useSharesStore((s) => s.byFileId[file.id])
  const busyFileId = useSharesStore((s) => s.busyFileId)
  const error = useSharesStore((s) => s.error)
  const startSharing = useSharesStore((s) => s.startSharing)
  const stopSharing = useSharesStore((s) => s.stopSharing)
  const dismissError = useSharesStore((s) => s.dismissError)
  const addToast = useToastStore((s) => s.addToast)

  if (!sdk) return null
  const busy = busyFileId === file.id
  const url = share && shareLinkUrl({ seed: share.seed, indexerUrl })

  return (
    <div className="space-y-3 rounded-lg bg-neutral-50 p-3">
      {error && <ErrorAlert onDismiss={dismissError}>{error}</ErrorAlert>}

      {url ? (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              aria-label="Share link"
              value={url}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-mono text-xs text-neutral-600"
            />
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(url)
                addToast('Share link copied')
              }}
            >
              Copy
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">
              Anyone with this link can download the file.
            </p>
            <Button
              size="sm"
              variant="danger"
              onClick={() => stopSharing(sdk, file.id)}
              disabled={busyFileId !== null}
            >
              {busy ? 'Stopping...' : 'Stop sharing'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">
            Anyone with the link can download this file, no account needed.
          </p>
          <Button
            size="sm"
            onClick={() => startSharing(sdk, file.id, file.object)}
            disabled={busyFileId !== null}
          >
            {busy ? 'Creating link...' : 'Create link'}
          </Button>
        </div>
      )}
    </div>
  )
}
