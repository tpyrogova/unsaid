import { useI18n } from '../i18n'

interface LoadingStateProps {
  /** Shown under the main line, e.g. how long a real model call takes. */
  hint?: string
}

export function LoadingState({ hint }: LoadingStateProps) {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-24">
      <span className="relative flex size-4">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-clay/40" />
        <span className="relative inline-flex size-4 rounded-full bg-clay" />
      </span>
      <p className="font-serif text-lg text-ink-soft">{t.loading.reading}</p>
      {hint && <p className="max-w-sm text-center text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}
