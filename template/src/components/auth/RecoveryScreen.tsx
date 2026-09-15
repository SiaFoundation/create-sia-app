import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
} from '@siafoundation/sia-storage'
import { useState } from 'react'

import { useAuthStore } from '../../stores/auth'
import { Button } from '../Button'
import { CopyButton } from '../CopyButton'
import { DevNote } from '../DevNote'
import { ErrorAlert } from '../ErrorAlert'
import { AuthCard } from './AuthCard'

type Mode = 'choose' | 'generate' | 'enter'

export function RecoveryScreen() {
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)
  const register = useAuthStore((s) => s.register)
  const startOver = useAuthStore((s) => s.startOver)
  const [mode, setMode] = useState<Mode>('choose')
  const [phrase, setPhrase] = useState('')
  const [phraseError, setPhraseError] = useState<string | null>(null)

  function generate() {
    setPhrase(generateRecoveryPhrase())
    setMode('generate')
  }

  function back() {
    setMode('choose')
    setPhrase('')
    setPhraseError(null)
  }

  function submit() {
    const words = phrase.trim()
    try {
      validateRecoveryPhrase(words)
    } catch {
      setPhraseError(
        'That is not a valid 12-word phrase. Check the words and their order.',
      )
      return
    }
    setPhraseError(null)
    register(words)
  }

  if (mode === 'choose') {
    return (
      <AuthCard
        title="Recovery phrase"
        description="New here? Generate a phrase. Already set up on another device? Enter the phrase you saved there."
      >
        <DevNote title="The phrase is the key">
          <p>
            The 12-word phrase derives the user&apos;s key, which encrypts their
            data and identifies them to the indexer. The same phrase always
            gives the same key, so entering it on a new device brings back the
            same files, and a lost phrase means lost data. The derived key is
            saved in localStorage so the user is not asked again on this device.
          </p>
        </DevNote>
        <div className="space-y-3">
          <Button onClick={generate}>Generate a new phrase</Button>
          <Button variant="secondary" onClick={() => setMode('enter')}>
            I already have a phrase
          </Button>
          <Button variant="link" onClick={startOver}>
            Start over
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={
        mode === 'generate' ? 'Save your recovery phrase' : 'Enter your phrase'
      }
      description={
        mode === 'generate'
          ? 'Write down these 12 words in order and keep them safe. They are the only way to get your files back.'
          : 'Enter your 12-word recovery phrase.'
      }
    >
      {mode === 'generate' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 p-4 bg-white rounded-lg border border-neutral-300">
            {phrase.split(' ').map((word, i) => (
              <div
                key={`${word}-${i}`}
                className="text-center py-2 bg-neutral-100 rounded text-sm"
              >
                <span className="text-neutral-400 mr-1">{i + 1}.</span>
                <span className="text-neutral-900">{word}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <CopyButton value={phrase} label="Recovery phrase copied" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="twelve words separated by spaces"
            rows={3}
            className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-green-600"
          />
          {phraseError && <p className="text-red-600 text-sm">{phraseError}</p>}
        </div>
      )}

      {error ? (
        <>
          <ErrorAlert>{error}</ErrorAlert>
          <Button onClick={startOver}>Start over</Button>
        </>
      ) : (
        <>
          <Button onClick={submit} disabled={busy || !phrase.trim()}>
            {busy ? 'Completing setup...' : 'Complete setup'}
          </Button>
          <Button variant="link" onClick={back} disabled={busy}>
            Back
          </Button>
        </>
      )}
    </AuthCard>
  )
}
