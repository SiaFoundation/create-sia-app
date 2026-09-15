import { AppKey, Builder, initSia } from '@siafoundation/sia-storage'
import { useEffect, useState } from 'react'

import { errorMessage } from '../../lib/connection'
import { APP_META } from '../../lib/constants'
import { useAuthStore } from '../../stores/auth'
import { ApproveScreen } from './ApproveScreen'
import { ConnectScreen } from './ConnectScreen'
import { LoadingScreen } from './LoadingScreen'
import { RecoveryScreen } from './RecoveryScreen'

export function AuthFlow() {
  const step = useAuthStore((s) => s.step)
  const startOver = useAuthStore((s) => s.startOver)
  const [attempt, setAttempt] = useState(0)
  const [reconnectError, setReconnectError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { storedKeyHex, indexerUrl, setSdk, setStep } =
        useAuthStore.getState()
      try {
        await initSia()

        if (storedKeyHex && indexerUrl) {
          const appKey = new AppKey(Uint8Array.fromHex(storedKeyHex))
          const builder = new Builder(indexerUrl, APP_META)
          const sdk = await builder.connected(appKey)

          if (cancelled) return
          if (sdk) {
            setSdk(sdk)
            return
          }
        }

        if (!cancelled) {
          setStep('connect')
        }
      } catch (e) {
        if (cancelled) return
        // A saved key means this user has already connected. A network error
        // here would otherwise send them through a new approval for an account
        // that exists, so offer a retry instead.
        if (storedKeyHex) {
          setReconnectError(
            `Could not reach the indexer to reconnect: ${errorMessage(e)}.`,
          )
        } else {
          console.error('Init error:', e)
          setStep('connect')
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div className="flex-1 flex flex-col">
      {step === 'loading' && !reconnectError && <LoadingScreen />}
      {step === 'loading' && reconnectError && (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <div className="w-full max-w-md space-y-4">
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
            >
              {reconnectError}
            </div>
            <button
              type="button"
              onClick={() => {
                setReconnectError(null)
                setAttempt((n) => n + 1)
              }}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                setReconnectError(null)
                startOver()
              }}
              className="w-full py-2 text-neutral-500 hover:text-neutral-900 text-sm transition-colors"
            >
              Connect again
            </button>
          </div>
        </div>
      )}
      {step === 'connect' && <ConnectScreen />}
      {step === 'approve' && <ApproveScreen />}
      {step === 'recovery' && <RecoveryScreen />}
    </div>
  )
}
