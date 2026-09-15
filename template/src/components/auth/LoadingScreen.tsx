import { useAuthStore } from '../../stores/auth'
import { Button } from '../Button'
import { ErrorAlert } from '../ErrorAlert'
import { AuthCard } from './AuthCard'

export function LoadingScreen() {
  const error = useAuthStore((s) => s.error)
  const startOver = useAuthStore((s) => s.startOver)

  if (!error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-green-600 rounded-full animate-spin" />
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <AuthCard
      title="Could not reconnect"
      description="Reload to try again, or start over with a new connection. Starting over needs your recovery phrase."
    >
      <ErrorAlert>{error}</ErrorAlert>
      <Button onClick={() => window.location.reload()}>Reload</Button>
      <Button variant="link" onClick={startOver}>
        Start over
      </Button>
    </AuthCard>
  )
}

export function UnavailableScreen() {
  const error = useAuthStore((s) => s.error)

  return (
    <AuthCard
      title="Could not load"
      description="The storage engine did not load. Reload the page to try again."
    >
      <ErrorAlert>{error}</ErrorAlert>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </AuthCard>
  )
}
