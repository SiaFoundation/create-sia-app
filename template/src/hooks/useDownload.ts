import type { Streams } from '@siafoundation/sia-storage'
import { useState } from 'react'

import { errorMessage } from '../lib/errors'
import type { DownloadProgress, StoredFile } from '../lib/files'

export type Download = ReturnType<typeof useDownload>

/**
 * Saves files with `streams.download()`, one at a time, with any error.
 *
 * Where the SDK's service worker runs, the file streams to the browser's
 * download manager, which shows the progress, and `download()` returns at
 * once. Where it cannot run, the page reads the file itself, and `progress`
 * follows that read for the file's row.
 */
export function useDownload() {
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Call this straight from the click handler. Without a service worker,
  // download() opens the browser's save picker, which the browser only allows
  // during a click, so nothing may be awaited before it.
  async function start(streams: Streams, file: StoredFile) {
    if (progress) return
    setError(null)
    setProgress({
      fileId: file.id,
      bytesDownloaded: 0,
      totalBytes: file.metadata.size,
    })
    try {
      await streams.download(file.object, {
        name: file.metadata.name,
        type: file.metadata.type,
        onProgress: (bytesDownloaded) =>
          setProgress((p) => p && { ...p, bytesDownloaded }),
        // A streamed download that fails after download() has returned.
        onError: (message) =>
          setError(`Download failed. ${errorMessage(message)}.`),
      })
    } catch (e) {
      setError(`Download failed. ${errorMessage(e)}.`)
    } finally {
      setProgress(null)
    }
  }

  return { progress, error, dismissError: () => setError(null), start }
}
