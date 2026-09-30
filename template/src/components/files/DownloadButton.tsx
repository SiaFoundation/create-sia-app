import type { Streams } from '@siafoundation/sia-storage'

import type { Download } from '../../hooks/useDownload'
import type { StoredFile } from '../../lib/files'
import { IconButton } from '../Button'
import { DownloadIcon, Spinner } from '../icons'

export function DownloadButton({
  streams,
  file,
  download,
}: {
  streams: Streams
  file: StoredFile
  download: Download
}) {
  const downloading = download.progress?.fileId === file.id

  return (
    <IconButton
      label="Download"
      onClick={() => download.start(streams, file)}
      disabled={download.progress !== null}
    >
      {downloading ? <Spinner /> : <DownloadIcon />}
    </IconButton>
  )
}
