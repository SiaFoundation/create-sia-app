import { useState } from 'react'

import { formatBytes } from '../../lib/files'
import { UploadIcon } from '../icons'

export type UploadProgress = {
  fileName: string
  fileSize: number
  shardsDone: number
  // Encoded bytes, so the bar is measured against `encodedTotal`.
  bytesUploaded: number
  encodedTotal: number
}

export function Dropzone({
  upload,
  onFiles,
}: {
  upload: UploadProgress | null
  onFiles: (files: FileList) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const border = upload
    ? 'border-neutral-300'
    : dragOver
      ? 'border-green-600 bg-green-600/5 cursor-pointer'
      : 'border-neutral-300 hover:border-neutral-400 cursor-pointer'

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (!upload && e.dataTransfer.files.length > 0) {
          onFiles(e.dataTransfer.files)
        }
      }}
      className={`block rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-green-600/40 ${border}`}
    >
      <input
        type="file"
        multiple
        className="sr-only"
        disabled={upload !== null}
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files)
          // Cleared so picking the same file again fires onChange.
          e.target.value = ''
        }}
      />
      {/* Children ignore the pointer so dragging over them does not fire dragleave. */}
      <div className="pointer-events-none">
        {upload ? <Progress upload={upload} /> : <Prompt />}
      </div>
    </label>
  )
}

function Prompt() {
  return (
    <div className="space-y-2">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <UploadIcon />
      </span>
      <p className="text-sm font-medium text-neutral-900">
        Drop files here or click to browse
      </p>
      <p className="text-xs text-neutral-500">
        Encrypted end-to-end and stored on the Sia network
      </p>
    </div>
  )
}

function Progress({ upload }: { upload: UploadProgress }) {
  const fraction = Math.min(1, upload.bytesUploaded / upload.encodedTotal)

  return (
    <div className="space-y-3">
      <p className="truncate text-sm text-neutral-900">
        Uploading {upload.fileName}
      </p>
      <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200">
        {upload.shardsDone === 0 ? (
          <div className="h-full w-1/4 rounded-full bg-green-600 animate-indeterminate" />
        ) : (
          <div
            className="h-full rounded-full bg-green-600 transition-all duration-300"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        )}
      </div>
      <p className="font-mono text-xs text-neutral-500">
        {upload.shardsDone} shards &middot;{' '}
        {formatBytes(fraction * upload.fileSize)} of{' '}
        {formatBytes(upload.fileSize)}
      </p>
    </div>
  )
}
