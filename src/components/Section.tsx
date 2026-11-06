import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  /** Short explanation of what the section shows, in plain language. */
  hint?: string
  children: ReactNode
}

export function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl text-ink">{title}</h2>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </header>
      {children}
    </section>
  )
}
