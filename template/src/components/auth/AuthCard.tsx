import type { ReactNode } from 'react'

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
          <p className="text-neutral-600 text-sm">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
