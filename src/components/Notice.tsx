import type { ReactNode } from 'react'

interface NoticeProps {
  tone?: 'error' | 'info'
  children: ReactNode
}

export function Notice({ tone = 'info', children }: NoticeProps) {
  const styles = tone === 'error' ? 'bg-clay-soft text-clay-deep' : 'bg-sage-soft text-ink'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${styles}`}>
      {children}
    </p>
  )
}
