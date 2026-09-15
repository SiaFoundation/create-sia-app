import { useMemo } from 'react'

import { APP_NAME } from '../lib/constants'
import { useAuthStore } from '../stores/auth'
import { CopyButton } from './CopyButton'

export function Navbar() {
  const sdk = useAuthStore((s) => s.sdk)
  const signOut = useAuthStore((s) => s.signOut)
  const publicKey = useMemo(() => sdk?.appKey().publicKey(), [sdk])

  return (
    <header className="border-b border-neutral-200/80">
      <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
        <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">
          {APP_NAME}
        </h1>
        {publicKey && (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-600" />
            <span
              className="text-[11px] font-mono text-neutral-500"
              title={`Your public key for this app: ${publicKey}`}
            >
              {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
            </span>
            <CopyButton value={publicKey} label="Public key copied" />
            <button
              type="button"
              onClick={signOut}
              title="Signing out forgets the saved key. You will need your recovery phrase to get back in."
              className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors ml-1"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
