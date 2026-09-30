import type { PinnedObject } from '@siafoundation/sia-storage'

// What this app writes into each object's encrypted metadata. The schema is
// the app's own; the SDK only stores the bytes.
export type FileMetadata = {
  name: string
  type: string
  size: number
  createdAt: number
}

export type StoredFile = {
  id: string
  metadata: FileMetadata
  object: PinnedObject
}

export function encodeFileMetadata(metadata: FileMetadata) {
  return new TextEncoder().encode(JSON.stringify(metadata))
}

export function readStoredFile(object: PinnedObject): StoredFile | null {
  try {
    const metadata = JSON.parse(new TextDecoder().decode(object.metadata()))
    if (typeof metadata?.name !== 'string') return null
    return { id: object.id(), metadata, object }
  } catch {
    return null
  }
}

/** A share's name: its file's name, or how many files it holds. */
export function shareTitle(files: StoredFile[]) {
  const [first] = files
  if (!first) return 'Empty share'
  return files.length === 1 ? first.metadata.name : `${files.length} files`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export type DownloadProgress = {
  fileId: string
  bytesDownloaded: number
  totalBytes: number
}

/** A file row's detail line: its size, or its progress while downloading. */
export function fileDetail(
  file: StoredFile,
  progress: DownloadProgress | null,
) {
  if (progress?.fileId !== file.id) return formatBytes(file.metadata.size)
  return `Downloading ${formatBytes(progress.bytesDownloaded)} of ${formatBytes(progress.totalBytes)}`
}
