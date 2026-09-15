import { AppKey, Builder, initSia, type Sdk } from '@siafoundation/sia-storage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { APP_ID, APP_META } from '../lib/constants'
import {
  describeApprovalError,
  describeRegisterError,
  errorMessage,
} from '../lib/errors'

/**
 * The connection flow, one step at a time:
 *
 *   loading    the page loads the SDK and, for a returning user, reconnects
 *   connect    the user picks an indexer and the app requests a connection
 *   approve    the user approves the request in another tab; the app waits
 *   recovery   the user creates or enters a recovery phrase to register
 *   connected  the Sdk is ready and the app renders
 *
 * Every step but `connected` can fail. The failure is kept in `error` for that
 * step, and `startOver` returns to `connect` with a clean slate.
 */
export type AuthStep =
  | 'loading'
  | 'connect'
  | 'approve'
  | 'recovery'
  | 'connected'

type AuthState = {
  // Persisted across reloads.
  // The user's key seed as hex. It lets a returning user reconnect without
  // their phrase, and anyone holding it can act as the user. This starter
  // keeps it in localStorage in plain text; decide on storage for your app.
  userKeyHex: string | null
  indexerUrl: string

  // Rebuilt on every page load.
  step: AuthStep
  // The SDK's Builder is a single connection request. requestConnection,
  // waitForApproval, and register each run once on it; after any of them
  // fails the request is dead and a new one has to be made.
  request: Builder | null
  approvalUrl: string | null
  sdk: Sdk | null
  // True while an action is talking to the indexer. Buttons disable on it, and
  // actions refuse to start, so nothing runs twice.
  busy: boolean
  // Why the current step failed. Cleared whenever the step changes.
  error: string | null

  reconnect: () => Promise<void>
  connect: (indexerUrl: string) => Promise<void>
  register: (phrase: string) => Promise<void>
  startOver: () => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      function finish(sdk: Sdk) {
        set({
          sdk,
          userKeyHex: sdk.appKey().export().toHex(),
          step: 'connected',
          request: null,
          approvalUrl: null,
          error: null,
        })
      }

      return {
        userKeyHex: null,
        indexerUrl: '',
        step: 'loading',
        request: null,
        approvalUrl: null,
        sdk: null,
        busy: false,
        error: null,

        reconnect: async () => {
          if (get().busy) return
          set({ busy: true })
          try {
            await initSia()
          } catch (e) {
            // initSia remembers a failed load, so only a reload can recover.
            set({
              busy: false,
              error: `Could not load the Sia storage engine. Reload the page to try again. ${errorMessage(e)}.`,
            })
            return
          }

          const { userKeyHex, indexerUrl } = get()
          if (!userKeyHex || !indexerUrl) {
            set({ busy: false, userKeyHex: null, step: 'connect' })
            return
          }
          try {
            const key = new AppKey(Uint8Array.fromHex(userKeyHex))
            const sdk = await new Builder(indexerUrl, APP_META).connected(key)
            if (sdk) {
              finish(sdk)
            } else {
              // The indexer no longer knows this key, so it is no use keeping.
              set({ userKeyHex: null, step: 'connect' })
            }
          } catch (e) {
            set({
              error: `Could not reconnect to ${indexerUrl}. ${errorMessage(e)}.`,
            })
          } finally {
            set({ busy: false })
          }
        },

        connect: async (indexerUrl) => {
          if (get().busy) return
          set({ busy: true })
          try {
            const request = new Builder(indexerUrl, APP_META)
            await request.requestConnection()
            set({
              indexerUrl,
              request,
              approvalUrl: request.responseUrl(),
              step: 'approve',
              error: null,
            })
            // The wait runs here, not in the approve screen, so remounting the
            // screen cannot start it twice. It cannot be cancelled, so when the
            // user has moved on to another request its result is dropped.
            request.waitForApproval().then(
              () => {
                if (get().request === request) set({ step: 'recovery' })
              },
              (e) => {
                if (get().request === request) {
                  set({ error: describeApprovalError(e) })
                }
              },
            )
          } catch (e) {
            set({
              error: `Could not reach the indexer at ${indexerUrl}. Check the address and that it allows requests from this origin. ${errorMessage(e)}.`,
            })
          } finally {
            set({ busy: false })
          }
        },

        register: async (phrase) => {
          const { busy, request } = get()
          if (busy || !request) return
          set({ busy: true })
          try {
            finish(await request.register(phrase))
          } catch (e) {
            set({ error: describeRegisterError(e) })
          } finally {
            set({ busy: false })
          }
        },

        startOver: () => {
          if (get().busy) return
          set({
            step: 'connect',
            request: null,
            approvalUrl: null,
            userKeyHex: null,
            error: null,
          })
        },

        signOut: () => {
          // The Sdk is a live WASM handle with background work of its own. A
          // reload is the one sure way to drop it.
          set({ userKeyHex: null })
          window.location.reload()
        },
      }
    },
    {
      // Keyed by app so scaffolds served from the same localhost origin do
      // not share a session.
      name: `sia-auth-${APP_ID.slice(0, 16)}`,
      partialize: (state) => ({
        userKeyHex: state.userKeyHex,
        indexerUrl: state.indexerUrl,
      }),
    },
  ),
)
