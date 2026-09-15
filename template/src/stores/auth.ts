import type { Builder, Sdk } from '@siafoundation/sia-storage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { describeApprovalError } from '../lib/connection'
import { APP_KEY } from '../lib/constants'

export type AuthStep =
  | 'loading'
  | 'connect'
  | 'approve'
  | 'recovery'
  | 'connected'

type AuthState = {
  sdk: Sdk | null
  storedKeyHex: string | null
  indexerUrl: string
  step: AuthStep
  // The Builder for the connection request in progress. A Builder that failed
  // to get approval cannot be reused, so starting over always replaces it.
  builder: Builder | null
  approvalUrl: string | null
  // Set when waiting for approval on the current Builder fails.
  approvalError: string | null
  setSdk: (sdk: Sdk) => void
  setStep: (step: AuthStep) => void
  setStoredKeyHex: (hex: string) => void
  setIndexerUrl: (url: string) => void
  startApproval: (builder: Builder) => void
  startOver: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sdk: null,
      storedKeyHex: null,
      indexerUrl: '',
      step: 'loading',
      builder: null,
      approvalUrl: null,
      approvalError: null,
      setSdk: (sdk) =>
        set({
          sdk,
          step: 'connected',
          builder: null,
          approvalUrl: null,
          approvalError: null,
        }),
      setStep: (step) => set({ step }),
      setStoredKeyHex: (hex) => set({ storedKeyHex: hex }),
      setIndexerUrl: (url) => set({ indexerUrl: url }),
      startApproval: (builder) => {
        set({
          builder,
          approvalUrl: builder.responseUrl(),
          approvalError: null,
          step: 'approve',
        })
        // The wait starts here rather than in the approve screen: the SDK
        // allows one waitForApproval() per Builder, and a component effect runs
        // again whenever the screen remounts. Going back or requesting a new
        // link replaces the Builder, and the SDK cannot cancel the old wait, so
        // a result for a replaced Builder is dropped.
        builder.waitForApproval().then(
          () => {
            if (get().builder === builder) set({ step: 'recovery' })
          },
          (e) => {
            if (get().builder === builder) {
              set({ approvalError: describeApprovalError(e) })
            }
          },
        )
      },
      startOver: () =>
        set({
          builder: null,
          approvalUrl: null,
          approvalError: null,
          step: 'connect',
        }),
      reset: () =>
        set({
          sdk: null,
          storedKeyHex: null,
          step: 'loading',
          builder: null,
          approvalUrl: null,
          approvalError: null,
        }),
    }),
    {
      name: `sia-auth-${APP_KEY.slice(0, 16)}`,
      partialize: (state) => ({
        storedKeyHex: state.storedKeyHex,
        indexerUrl: state.indexerUrl,
      }),
    },
  ),
)
