import { useAuthStore } from '../../stores/auth'
import { Button, LinkButton } from '../Button'
import { CopyButton } from '../CopyButton'
import { DevNote } from '../DevNote'
import { ErrorAlert } from '../ErrorAlert'
import { AuthCard } from './AuthCard'

export function ApproveScreen() {
  const approvalUrl = useAuthStore((s) => s.approvalUrl)
  const indexerUrl = useAuthStore((s) => s.indexerUrl)
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)
  const connect = useAuthStore((s) => s.connect)
  const startOver = useAuthStore((s) => s.startOver)

  return (
    <AuthCard
      title="Approve the connection"
      description="Open the link below to approve this app, then come back here."
    >
      <DevNote title="Approval happens in another tab">
        <p>
          The user approves the request on the indexer&apos;s site while the app
          waits on <code>request.waitForApproval()</code>. If the request is
          denied or a status check fails, that request is spent, so the screen
          offers a new one.
        </p>
      </DevNote>

      {error ? (
        <>
          <ErrorAlert>{error}</ErrorAlert>
          <Button onClick={() => connect(indexerUrl)} disabled={busy}>
            {busy ? 'Requesting...' : 'Request a new link'}
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 bg-white border border-neutral-300 rounded-lg">
            <span className="flex-1 text-sm font-mono text-neutral-600 truncate">
              {approvalUrl}
            </span>
            <CopyButton value={approvalUrl ?? ''} label="Link copied" />
          </div>
          <LinkButton
            href={approvalUrl ?? ''}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open approval link
          </LinkButton>
          <p className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
            Waiting for approval. This page continues on its own.
          </p>
        </>
      )}

      <Button variant="link" onClick={startOver} disabled={busy}>
        Start over
      </Button>
    </AuthCard>
  )
}
