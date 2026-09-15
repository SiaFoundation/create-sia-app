import {
  encodedSize,
  PinnedObject,
  type Sdk,
  type ShardProgress,
} from '@siafoundation/sia-storage'
import { useEffect, useState } from 'react'

import { useDownload } from '../../hooks/useDownload'
import { APP_ID, DATA_SHARDS, PARITY_SHARDS } from '../../lib/constants'
import { errorMessage } from '../../lib/errors'
import {
  encodeFileMetadata,
  type FileMetadata,
  fileDetail,
  readStoredFile,
  type StoredFile,
} from '../../lib/files'
import { useAuthStore } from '../../stores/auth'
import { useSharesStore } from '../../stores/shares'
import { IconButton } from '../Button'
import { DevNote } from '../DevNote'
import { ErrorAlert } from '../ErrorAlert'
import { FileIcon, LinkIcon } from '../icons'
import { Section } from '../Layout'
import { Badge, List, Row } from '../List'
import { DownloadButton } from './DownloadButton'
import { Dropzone, type UploadProgress } from './Dropzone'
import { ShareControls } from './ShareControls'

const isPlaceholderId = APP_ID.startsWith('{{')

async function fetchFiles(sdk: Sdk): Promise<StoredFile[]> {
  const events = await sdk.objectEvents(undefined, 100)
  const files: StoredFile[] = []
  for (const event of events) {
    if (event.deleted || !event.object) continue
    const file = readStoredFile(event.object)
    if (file) files.push(file)
  }
  return files
}

/** The signed-in user's files: upload, list, download, and share. */
export function YourFiles() {
  const sdk = useAuthStore((s) => s.sdk)
  const shares = useSharesStore((s) => s.byFileId)
  const [files, setFiles] = useState<StoredFile[]>([])
  const [upload, setUpload] = useState<UploadProgress | null>(null)
  const [sharingFileId, setSharingFileId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const download = useDownload()

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

  async function uploadFile(sdk: Sdk, file: File) {
    setUpload({
      fileName: file.name,
      fileSize: file.size,
      shardsDone: 0,
      bytesUploaded: 0,
      encodedTotal: encodedSize(file.size, DATA_SHARDS, PARITY_SHARDS),
    })
    try {
      // upload() consumes the object passed in. Use the one it returns.
      const pinnedObject = await sdk.upload(new PinnedObject(), file.stream(), {
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
      pinnedObject.updateMetadata(encodeFileMetadata(metadata))
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

  async function uploadFiles(fileList: FileList) {
    if (!sdk) return
    setError(null)
    for (const file of Array.from(fileList)) {
      await uploadFile(sdk, file)
    }
  }

  if (!sdk) return null

  return (
    <Section
      title="Your files"
      detail={
        files.length > 0
          ? `${files.length} file${files.length === 1 ? '' : 's'}`
          : undefined
      }
    >
      {isPlaceholderId && (
        <DevNote title="Set your app ID">
          <p>
            This is the template placeholder. Set your own app ID in{' '}
            <code>src/lib/constants.ts</code> or scaffold a fresh project with{' '}
            <code>bunx create-sia-app</code>.
          </p>
        </DevNote>
      )}

      <DevNote title="Upload, download, and share">
        <p>
          <code>sdk.upload()</code> encrypts, erasure-codes, and streams shards
          directly to Sia hosts, and <code>sdk.download()</code> streams the
          decrypted bytes back. Sharing creates a key with{' '}
          <code>sdk.createSharingKey()</code>, attaches the file with{' '}
          <code>sdk.shareObject()</code>, and puts the key&apos;s seed in the
          link.
        </p>
      </DevNote>

      {error && (
        <ErrorAlert onDismiss={() => setError(null)}>{error}</ErrorAlert>
      )}
      {download.error && (
        <ErrorAlert onDismiss={download.dismissError}>
          {download.error}
        </ErrorAlert>
      )}

      <Dropzone upload={upload} onFiles={uploadFiles} />

      {files.length > 0 && (
        <List>
          {files.map((file) => {
            const sharing = sharingFileId === file.id
            return (
              <Row
                key={file.id}
                icon={<FileIcon />}
                title={file.metadata.name}
                badge={shares[file.id] && <Badge>Shared</Badge>}
                detail={fileDetail(file, download.progress)}
                actions={
                  <>
                    <IconButton
                      label="Share"
                      aria-expanded={sharing}
                      onClick={() => setSharingFileId(sharing ? null : file.id)}
                    >
                      <LinkIcon />
                    </IconButton>
                    <DownloadButton
                      source={sdk}
                      file={file}
                      download={download}
                    />
                  </>
                }
              >
                {sharing && <ShareControls file={file} />}
              </Row>
            )
          })}
        </List>
      )}
    </Section>
  )
}
