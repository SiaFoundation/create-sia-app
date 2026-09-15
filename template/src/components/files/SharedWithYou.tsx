import { useEffect } from 'react'

import { formatBytes, shareTitle } from '../../lib/files'
import { type ShareLink, shareLinkUrl } from '../../lib/shareLink'
import { useSharedWithYouStore } from '../../stores/sharedWithYou'
import { useIsSharedByYou } from '../../stores/shares'
import { IconButton } from '../Button'
import { CloseIcon, LinkIcon } from '../icons'
import { Section } from '../Layout'
import { Badge, List, Row } from '../List'

/** Share links opened on this device. Each row opens the share's page. */
export function SharedWithYou() {
  const links = useSharedWithYouStore((s) => s.links)

  return (
    <Section title="Shared with you">
      <List>
        {links.map((link) => (
          <LinkRow key={link.seed} link={link} />
        ))}
      </List>
    </Section>
  )
}

function LinkRow({ link }: { link: ShareLink }) {
  const view = useSharedWithYouStore((s) => s.views[link.seed])
  const load = useSharedWithYouStore((s) => s.load)
  const remove = useSharedWithYouStore((s) => s.remove)
  const isSharedByYou = useIsSharedByYou(link.seed)

  useEffect(() => {
    if (!view) load(link)
  }, [view, load, link])

  let title = 'Opening share...'
  let detail: string | undefined
  if (view?.status === 'ready') {
    title = shareTitle(view.files)
    detail = formatBytes(
      view.files.reduce((sum, f) => sum + f.metadata.size, 0),
    )
  } else if (view?.status === 'unavailable') {
    title = 'Share unavailable'
    detail = 'Stopped or expired'
  } else if (view?.status === 'error') {
    title = 'Could not open share'
    detail = view.message
  }

  return (
    <Row
      href={shareLinkUrl(link)}
      icon={<LinkIcon />}
      title={title}
      detail={detail}
      badge={isSharedByYou && <Badge>Shared by you</Badge>}
      actions={
        <IconButton label="Remove from list" onClick={() => remove(link.seed)}>
          <CloseIcon />
        </IconButton>
      }
    />
  )
}
