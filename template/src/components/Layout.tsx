import type { ReactNode } from 'react'

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8">
      {children}
    </main>
  )
}

export function Section({
  title,
  detail,
  children,
}: {
  title: string
  detail?: string | undefined
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {detail && <p className="text-sm text-neutral-500">{detail}</p>}
      </div>
      {children}
    </section>
  )
}
