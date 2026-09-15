import { AuthFlow } from '../components/auth/AuthFlow'
import { SharedWithYou } from '../components/files/SharedWithYou'
import { YourFiles } from '../components/files/YourFiles'
import { Page } from '../components/Layout'
import { useAuthStore } from '../stores/auth'
import { useSharedWithYouStore } from '../stores/sharedWithYou'

export function HomePage() {
  const step = useAuthStore((s) => s.step)
  const hasLinks = useSharedWithYouStore((s) => s.links.length > 0)

  if (step !== 'connected') {
    return (
      <>
        <AuthFlow />
        {step !== 'loading' && hasLinks && (
          <Page>
            <SharedWithYou />
          </Page>
        )}
      </>
    )
  }

  return (
    <Page>
      <YourFiles />
      {hasLinks && <SharedWithYou />}
    </Page>
  )
}
