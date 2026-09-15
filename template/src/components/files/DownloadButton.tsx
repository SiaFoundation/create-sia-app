import type { Download } from '../../hooks/useDownload'
import type { Downloader, StoredFile } from '../../lib/files'
import { IconButton } from '../Button'
import { DownloadIcon, Spinner } from '../icons'

export function DownloadButton({
  source,
  file,
  download,
}: {
  source: Downloader
  file: StoredFile
  download: Download
}) {
  const downloading = download.progress?.fileId === file.id

  return (
    <IconButton
      label="Download"
      onClick={() => download.start(source, file)}
      disabled={download.progress !== null}
    >
      {downloading ? <Spinner /> : <DownloadIcon />}
    </IconButton>
  )
}
