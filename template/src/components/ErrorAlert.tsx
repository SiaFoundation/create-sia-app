import type { ReactNode } from 'react'

export function ErrorAlert({
  children,
  onDismiss,
}: {
  children: ReactNode
  onDismiss?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
    >
      <p className="flex-1">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-900"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
