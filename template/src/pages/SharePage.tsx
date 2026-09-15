import { useEffect } from 'react'

import { Button } from '../components/Button'
import { DevNote } from '../components/DevNote'
import { ErrorAlert } from '../components/ErrorAlert'
import { DownloadButton } from '../components/files/DownloadButton'
import { ArrowLeftIcon, FileIcon, Spinner } from '../components/icons'
import { Page } from '../components/Layout'
import { List, Row } from '../components/List'
import { useDownload } from '../hooks/useDownload'
import { fileDetail, shareTitle } from '../lib/files'
import type { ShareLink } from '../lib/shareLink'
import { useSharedWithYouStore } from '../stores/sharedWithYou'
import { useIsSharedByYou } from '../stores/shares'

/** The files behind one share link. Works without signing in. */
export function SharePage({ link }: { link: ShareLink }) {
  const view = useSharedWithYouStore((s) => s.views[link.seed])
  const open = useSharedWithYouStore((s) => s.open)
  const load = useSharedWithYouStore((s) => s.load)
  const remove = useSharedWithYouStore((s) => s.remove)
  const isSharedByYou = useIsSharedByYou(link.seed)
  const download = useDownload()

  useEffect(() => {
    open(link)
    // A fragment that matches no element keeps the previous scroll position.
    window.scrollTo(0, 0)
  }, [open, link])

  const title =
    view?.status === 'ready'
      ? shareTitle(view.files)
      : view?.status === 'unavailable'
        ? 'Share unavailable'
        : 'Share'

  function removeAndLeave() {
    remove(link.seed)
    // Replace, so the browser's back button does not reopen, and re-save, it.
    window.location.replace('#')
  }

  return (
    <Page>
      <div className="space-y-4">
        <a
          href="#"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeftIcon />
          Back
        </a>
        <header className="space-y-1">
          <p className="text-sm text-neutral-500">
            {isSharedByYou ? 'Shared by you' : 'Shared with you'}
          </p>
          <h1 className="truncate text-2xl font-semibold text-neutral-900">
            {title}
          </h1>
        </header>
      </div>

      <DevNote title="Opening a share">
        <p>
          <code>SharedSdk.connect(indexerUrl, seed)</code> opens the share
          without an account, <code>objects()</code> lists its files, and{' '}
          <code>download()</code> streams them. The owner pays for downloads.
          Links opened here are saved in localStorage.
        </p>
      </DevNote>

      {(!view || view.status === 'loading') && (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Spinner />
          Opening share...
        </p>
      )}

      {view?.status === 'unavailable' && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-700">
            Its owner stopped sharing it, or it expired.
          </p>
          <Button size="sm" variant="secondary" onClick={removeAndLeave}>
            Remove from list
          </Button>
        </div>
      )}

      {view?.status === 'error' && (
        <div className="space-y-3">
          <ErrorAlert>{view.message}</ErrorAlert>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => load(link)}>
              Try again
            </Button>
            <Button size="sm" variant="secondary" onClick={removeAndLeave}>
              Remove from list
            </Button>
          </div>
        </div>
      )}

      {view?.status === 'ready' && (
        <div className="space-y-4">
          {download.error && (
            <ErrorAlert onDismiss={download.dismissError}>
              {download.error}
            </ErrorAlert>
          )}
          {view.files.length === 0 ? (
            <p className="text-sm text-neutral-500">This share has no files.</p>
          ) : (
            <List>
              {view.files.map((file) => (
                <Row
                  key={file.id}
                  icon={<FileIcon />}
                  title={file.metadata.name}
                  detail={fileDetail(file, download.progress)}
                  actions={
                    <DownloadButton
                      source={view.sdk}
                      file={file}
                      download={download}
                    />
                  }
                />
              ))}
            </List>
          )}
        </div>
      )}
    </Page>
  )
}
