import type { PinnedObject, Sdk, SharingKey } from '@siafoundation/sia-storage'
import { create } from 'zustand'

import { errorMessage } from '../lib/errors'
import { useSharedWithYouStore } from './sharedWithYou'

/**
 * The signed-in user's public shares, one sharing key per file.
 *
 * A sharing key grants read access to the objects attached to it. This app
 * gives each shared file its own key, so stopping one share never affects
 * another, and records which file a key belongs to in the key's description.
 * The indexer has no lookup from object to key, so listing the keys is how the
 * app learns which files are shared.
 */

const DESCRIPTION_PREFIX = 'file:'
const PAGE_SIZE = 500

type Share = {
  key: SharingKey
  // Hex seed for the share link. The SDK re-derives it from the user's key, so
  // it never has to be stored.
  seed: string
}

type SharesState = {
  byFileId: Record<string, Share>
  // The file whose share is being created or revoked.
  busyFileId: string | null
  error: string | null

  load: (sdk: Sdk) => Promise<void>
  startSharing: (
    sdk: Sdk,
    fileId: string,
    object: PinnedObject,
  ) => Promise<void>
  stopSharing: (sdk: Sdk, fileId: string) => Promise<void>
  dismissError: () => void
}

export const useSharesStore = create<SharesState>()((set, get) => ({
  byFileId: {},
  busyFileId: null,
  error: null,

  load: async (sdk) => {
    try {
      const byFileId: Record<string, Share> = {}
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const records = await sdk.sharingKeys(offset, PAGE_SIZE)
        for (const { description, key } of records) {
          if (!description.startsWith(DESCRIPTION_PREFIX)) continue
          const fileId = description.slice(DESCRIPTION_PREFIX.length)
          byFileId[fileId] = { key, seed: key.seed() }
        }
        if (records.length < PAGE_SIZE) break
      }
      set({ byFileId })
    } catch (e) {
      set({ error: `Could not load your shares. ${errorMessage(e)}.` })
    }
  },

  startSharing: async (sdk, fileId, object) => {
    if (get().busyFileId) return
    set({ busyFileId: fileId, error: null })
    try {
      const key = await sdk.createSharingKey(`${DESCRIPTION_PREFIX}${fileId}`)
      try {
        await sdk.shareObject(key, object)
      } catch (e) {
        // Do not leave an empty key behind for a file that is not shared.
        await sdk.revokeSharingKey(key).catch(() => {})
        throw e
      }
      set((s) => ({
        byFileId: { ...s.byFileId, [fileId]: { key, seed: key.seed() } },
      }))
    } catch (e) {
      set({ error: `Could not share. ${errorMessage(e)}.` })
    } finally {
      set({ busyFileId: null })
    }
  },

  stopSharing: async (sdk, fileId) => {
    const share = get().byFileId[fileId]
    if (get().busyFileId || !share) return
    set({ busyFileId: fileId, error: null })
    try {
      // Revoking cuts off everyone holding the link, this device included.
      await sdk.revokeSharingKey(share.key)
      set((s) => {
        const { [fileId]: _, ...rest } = s.byFileId
        return { byFileId: rest }
      })
      // The owner may have opened their own link on this device. Reload it so
      // it shows as stopped.
      const sharedWithYou = useSharedWithYouStore.getState()
      const opened = sharedWithYou.links.find((l) => l.seed === share.seed)
      if (opened) sharedWithYou.load(opened)
    } catch (e) {
      set({ error: `Could not stop sharing. ${errorMessage(e)}.` })
    } finally {
      set({ busyFileId: null })
    }
  },

  dismissError: () => set({ error: null }),
}))

/** Whether the share link with this seed is one of the user's own shares. */
export function useIsSharedByYou(seed: string) {
  return useSharesStore((s) =>
    Object.values(s.byFileId).some((share) => share.seed === seed),
  )
}
