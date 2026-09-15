import { useAuthStore } from '../../stores/auth'
import { ApproveScreen } from './ApproveScreen'
import { ConnectScreen } from './ConnectScreen'
import { LoadingScreen, UnavailableScreen } from './LoadingScreen'
import { RecoveryScreen } from './RecoveryScreen'

export function AuthFlow() {
  const step = useAuthStore((s) => s.step)

  switch (step) {
    case 'loading':
      return <LoadingScreen />
    case 'unavailable':
      return <UnavailableScreen />
    case 'connect':
      return <ConnectScreen />
    case 'approve':
      return <ApproveScreen />
    case 'recovery':
      return <RecoveryScreen />
    case 'connected':
      return null
  }
}
