import { initSia, SharedSdk } from '@siafoundation/sia-storage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { APP_ID } from '../lib/constants'
import { errorMessage } from '../lib/errors'
import { readStoredFile, type StoredFile } from '../lib/files'
import type { ShareLink } from '../lib/shareLink'

/**
 * Share links opened on this device, and what each one grants.
 *
 * A link works without an account: `SharedSdk.connect(indexerUrl, seed)`
 * returns a read-only client for the objects on that sharing key, and the
 * owner pays for the downloads. Links are remembered per device, whether or
 * not anyone is signed in, so a share opened once stays in the list.
 */

const PAGE_SIZE = 500
const STORAGE_KEY = `sia-shared-with-you-${APP_ID.slice(0, 16)}`

export type SharedView =
  | { status: 'loading' }
  | { status: 'ready'; sdk: SharedSdk; files: StoredFile[] }
  // The owner stopped sharing, or the key expired.
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

type SharedWithYouState = {
  // Persisted. Each seed grants read access to its share, so treat this list
  // like the user's own key: it is in localStorage in plain text here.
  links: ShareLink[]

  // Rebuilt on every page load.
  views: Record<string, SharedView>

  open: (link: ShareLink) => void
  load: (link: ShareLink) => Promise<void>
  remove: (seed: string) => void
}

async function listFiles(sdk: SharedSdk) {
  const files: StoredFile[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const objects = await sdk.objects(offset, PAGE_SIZE)
    for (const object of objects) {
      const file = readStoredFile(object)
      if (file) files.push(file)
    }
    if (objects.length < PAGE_SIZE) return files
  }
}

export const useSharedWithYouStore = create<SharedWithYouState>()(
  persist(
    (set, get) => {
      function setView(seed: string, view: SharedView) {
        // A link removed while it was loading stays removed.
        if (!get().links.some((l) => l.seed === seed)) return
        set((s) => ({ views: { ...s.views, [seed]: view } }))
      }

      return {
        links: [],
        views: {},

        open: (link) => {
          if (!get().links.some((l) => l.seed === link.seed)) {
            set((s) => ({ links: [link, ...s.links] }))
          }
          if (!get().views[link.seed]) get().load(link)
        },

        load: async (link) => {
          if (get().views[link.seed]?.status === 'loading') return
          setView(link.seed, { status: 'loading' })
          try {
            await initSia()
            const sdk = await SharedSdk.connect(link.indexerUrl, link.seed)
            const files = await listFiles(sdk)
            setView(link.seed, { status: 'ready', sdk, files })
          } catch (e) {
            const message = errorMessage(e)
            // The indexer answers 401 "sharing key not found" once a key is
            // revoked or expired.
            setView(
              link.seed,
              message.includes('sharing key not found')
                ? { status: 'unavailable' }
                : {
                    status: 'error',
                    message: `Could not open this share. ${message}.`,
                  },
            )
          }
        },

        remove: (seed) =>
          set((s) => {
            const { [seed]: _, ...views } = s.views
            return { links: s.links.filter((l) => l.seed !== seed), views }
          }),
      }
    },
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ links: state.links }),
    },
  ),
)

// Each write saves the whole list. Without reloading it when another tab
// changes it, this tab's next write would drop the other tab's links.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) useSharedWithYouStore.persist.rehydrate()
})
