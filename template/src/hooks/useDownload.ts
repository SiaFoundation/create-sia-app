import { useState } from 'react'

import { errorMessage } from '../lib/errors'
import {
  type Downloader,
  type DownloadProgress,
  saveFile,
  type StoredFile,
} from '../lib/files'

export type Download = ReturnType<typeof useDownload>

/** One download at a time, with its progress and any error. */
export function useDownload() {
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function start(source: Downloader, file: StoredFile) {
    if (progress) return
    setError(null)
    setProgress({
      fileId: file.id,
      bytesDownloaded: 0,
      totalBytes: file.metadata.size,
    })
    try {
      await saveFile(source, file, (bytesDownloaded) =>
        setProgress((p) => p && { ...p, bytesDownloaded }),
      )
    } catch (e) {
      setError(`Download failed. ${errorMessage(e)}.`)
    } finally {
      setProgress(null)
    }
  }

  return { progress, error, dismissError: () => setError(null), start }
}
