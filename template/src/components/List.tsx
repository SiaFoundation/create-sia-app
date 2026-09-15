import type { ReactNode } from 'react'

import { ChevronRightIcon } from './icons'

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {children}
    </ul>
  )
}

/**
 * One item in a List. With `href` the row is a link, apart from its actions.
 * `children` render inside the row, below it, for panels like sharing.
 */
export function Row({
  icon,
  title,
  badge,
  detail,
  href,
  actions,
  children,
}: {
  icon: ReactNode
  title: string
  badge?: ReactNode
  detail?: ReactNode
  href?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  const content = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-900">
            {title}
          </span>
          {badge}
        </span>
        {detail && (
          <span className="block truncate text-xs text-neutral-500">
            {detail}
          </span>
        )}
      </span>
    </>
  )
  const contentClass = 'flex min-w-0 flex-1 items-center gap-3 py-3 pl-4'

  return (
    <li className={href ? 'hover:bg-neutral-50' : undefined}>
      <div className="flex items-center gap-2 pr-3">
        {href ? (
          <a href={href} className={contentClass}>
            {content}
            <span className="text-neutral-400">
              <ChevronRightIcon />
            </span>
          </a>
        ) : (
          <div className={contentClass}>{content}</div>
        )}
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      {children && <div className="px-4 pb-4">{children}</div>}
    </li>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-green-600/10 px-2 py-0.5 text-[11px] font-medium text-green-700">
      {children}
    </span>
  )
}
