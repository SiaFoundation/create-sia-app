import {
  encodedSize,
  PinnedObject,
  type Sdk,
  type ShardProgress,
} from '@siafoundation/sia-storage'
import { useEffect, useState } from 'react'

import { APP_ID, DATA_SHARDS, PARITY_SHARDS } from '../../lib/constants'
import { errorMessage } from '../../lib/errors'
import { useAuthStore } from '../../stores/auth'
import { DevNote } from '../DevNote'
import { ErrorAlert } from '../ErrorAlert'

type FileMetadata = {
  name: string
  type: string
  size: number
  createdAt: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function decodeMetadata(bytes: Uint8Array): FileMetadata | null {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as FileMetadata
  } catch {
    return null
  }
}

type UploadedFile = {
  id: string
  metadata: FileMetadata
  object: PinnedObject
}

type UploadProgress = {
  fileName: string
  fileSize: number
  shardsDone: number
  bytesUploaded: number
  encodedTotal: number
}

type DownloadProgress = {
  fileId: string
  shardsDone: number
  bytesDownloaded: number
  totalBytes: number
}

const isPlaceholderId = APP_ID.startsWith('{{')

async function fetchFiles(sdk: Sdk): Promise<UploadedFile[]> {
  const events = await sdk.objectEvents(undefined, 100)
  const loaded: UploadedFile[] = []
  for (const event of events) {
    if (event.deleted || !event.object) continue
    const meta = decodeMetadata(event.object.metadata())
    if (meta?.name) {
      loaded.push({
        id: event.object.id(),
        metadata: meta,
        object: event.object,
      })
    }
  }
  return loaded
}

async function readChunks(
  stream: ReadableStream<Uint8Array>,
  onBytes: (bytesRead: number) => void,
): Promise<Uint8Array[]> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) return chunks
    chunks.push(value)
    bytesRead += value.length
    onBytes(bytesRead)
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // Some browsers cancel the download if the URL goes away in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function UploadZone() {
  const sdk = useAuthStore((s) => s.sdk)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [upload, setUpload] = useState<UploadProgress | null>(null)
  const [download, setDownload] = useState<DownloadProgress | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sdk) return
    let cancelled = false
    fetchFiles(sdk)
      .then((loaded) => {
        if (!cancelled) setFiles(loaded)
      })
      .catch((e) => {
        if (!cancelled) setError(`Could not list files. ${errorMessage(e)}.`)
      })
    return () => {
      cancelled = true
    }
  }, [sdk])

  async function uploadFile(file: File) {
    if (!sdk) return
    const encodedTotal = encodedSize(file.size, DATA_SHARDS, PARITY_SHARDS)
    setUpload({
      fileName: file.name,
      fileSize: file.size,
      shardsDone: 0,
      bytesUploaded: 0,
      encodedTotal,
    })

    try {
      // upload() takes ownership of this object; use the returned one after.
      const object = new PinnedObject()
      const pinnedObject = await sdk.upload(object, file.stream(), {
        dataShards: DATA_SHARDS,
        parityShards: PARITY_SHARDS,
        onShardUploaded: (progress: ShardProgress) =>
          setUpload(
            (u) =>
              u && {
                ...u,
                shardsDone: u.shardsDone + 1,
                bytesUploaded: u.bytesUploaded + progress.shardSize,
              },
          ),
      })

      const metadata: FileMetadata = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: Date.now(),
      }

      pinnedObject.updateMetadata(
        new TextEncoder().encode(JSON.stringify(metadata)),
      )
      await sdk.pinObject(pinnedObject)
      await sdk.updateObjectMetadata(pinnedObject)

      setFiles((prev) => [
        { id: pinnedObject.id(), metadata, object: pinnedObject },
        ...prev,
      ])
    } catch (e) {
      setError(`Upload failed. ${errorMessage(e)}.`)
    } finally {
      setUpload(null)
    }
  }

  async function downloadFile(file: UploadedFile) {
    if (!sdk) return
    setDownload({
      fileId: file.id,
      shardsDone: 0,
      bytesDownloaded: 0,
      totalBytes: file.metadata.size,
    })
    try {
      const stream = sdk.download(file.object, {
        onShardDownloaded: () =>
          setDownload((d) => d && { ...d, shardsDone: d.shardsDone + 1 }),
      })
      const chunks = await readChunks(stream, (bytesDownloaded) =>
        setDownload((d) => d && { ...d, bytesDownloaded }),
      )

      // TypeScript's BlobPart does not yet accept Uint8Array<ArrayBufferLike>.
      const blob = new Blob(chunks as BlobPart[], { type: file.metadata.type })
      saveBlob(blob, file.metadata.name)
    } catch (e) {
      setError(`Download failed. ${errorMessage(e)}.`)
    } finally {
      setDownload(null)
    }
  }

  async function handleFiles(fileList: FileList) {
    setError(null)
    for (const file of Array.from(fileList)) {
      await uploadFile(file)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (upload) return
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const uploadPercent = upload
    ? Math.min(
        100,
        Math.round((upload.bytesUploaded / upload.encodedTotal) * 100),
      )
    : 0

  return (
    <div className="flex-1 p-6 space-y-5 max-w-5xl mx-auto w-full">
      {isPlaceholderId && (
        <DevNote title="Set your app ID">
          <p>
            This is the template placeholder. Set your own app ID in{' '}
            <code>src/lib/constants.ts</code> or scaffold a fresh project with{' '}
            <code>bunx create-sia-app</code>.
          </p>
        </DevNote>
      )}

      <DevNote title="Upload and download">
        <p>
          <code>sdk.upload(object, file.stream(), opts)</code> encrypts,
          erasure-codes, and streams shards directly to Sia hosts.{' '}
          <code>sdk.download(object, opts)</code> returns a{' '}
          <code>ReadableStream</code> of decrypted bytes. Per-shard progress is
          reported via <code>onShardUploaded</code> /{' '}
          <code>onShardDownloaded</code>.
        </p>
      </DevNote>

      {error && (
        <ErrorAlert onDismiss={() => setError(null)}>{error}</ErrorAlert>
      )}

      <label
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        className={`relative block border-2 border-dashed rounded-xl p-16 text-center transition-all duration-150 ${
          upload
            ? 'border-neutral-300 cursor-default'
            : dragOver
              ? 'border-green-600 bg-green-600/5 cursor-pointer'
              : 'border-neutral-300 hover:border-neutral-400 cursor-pointer'
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          disabled={upload !== null}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            // Cleared so picking the same file again fires onChange.
            e.target.value = ''
          }}
        />

        {upload ? (
          <div className="space-y-4">
            <p className="text-neutral-700 text-sm">
              Uploading{' '}
              <span className="text-neutral-900">{upload.fileName}</span>{' '}
              <span className="text-neutral-500">
                ({formatBytes(upload.fileSize)})
              </span>
            </p>
            <div className="w-full max-w-xs mx-auto bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              {upload.shardsDone === 0 ? (
                <div className="bg-green-600 h-full rounded-full w-1/4 animate-indeterminate" />
              ) : (
                <div
                  className="bg-green-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              )}
            </div>
            <p className="text-neutral-500 text-xs font-mono">
              {upload.shardsDone} shards &middot;{' '}
              {formatBytes(
                (upload.bytesUploaded / upload.encodedTotal) * upload.fileSize,
              )}{' '}
              / {formatBytes(upload.fileSize)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="w-8 h-8 mx-auto text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
              <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
            </svg>
            <p className="text-neutral-600 text-sm">
              Drop files here or click to browse
            </p>
            <p className="text-neutral-500 text-xs">
              Encrypted end-to-end and stored on the Sia network
            </p>
          </div>
        )}
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </h2>
          <div className="divide-y divide-neutral-200/80">
            {files.map((file) => {
              const progress = download?.fileId === file.id ? download : null
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-neutral-900 truncate">
                      {file.metadata.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatBytes(file.metadata.size)}
                      {file.metadata.type !== 'application/octet-stream' && (
                        <span> &middot; {file.metadata.type}</span>
                      )}
                      {progress && (
                        <span>
                          {' '}
                          &middot; {formatBytes(
                            progress.bytesDownloaded,
                          )} /{' '}
                          {formatBytes(progress.totalBytes)} (
                          {progress.shardsDone} shards)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadFile(file)}
                      disabled={download !== null}
                      className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-default transition-colors"
                      title="Download"
                    >
                      {progress ? (
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 019.17 6" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
                          <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
