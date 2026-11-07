interface LogoMarkProps {
  className?: string
}

/**
 * The Unsaid mark: a speech bubble whose outline is left open — something not
 * yet said — with an ellipsis that fades out.
 */
export function LogoMark({ className = 'size-9' }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <path
        d="M27.5 7.4C25.2 6.5 22.7 6 20 6 11.7 6 5 12 5 19.5c0 4.1 2 7.8 5.3 10.3L9 35l6.2-2.8c1.5.5 3.1.8 4.8.8 8.3 0 15-6 15-13.5 0-2.6-.8-5-2.2-7.1"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="19.5" r="2" fill="currentColor" />
      <circle cx="20" cy="19.5" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="26.5" cy="19.5" r="2" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

import { useI18n } from '../i18n'

interface LogoProps {
  onClick: () => void
}

/** Mark + wordmark. Always leads to the landing page. */
export function Logo({ onClick }: LogoProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.common.logoLabel}
      className="group -m-1 flex items-center gap-2.5 rounded-xl p-1 text-clay-deep transition-colors hover:text-clay focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none"
    >
      <LogoMark className="size-9 transition-transform group-hover:-rotate-6" />
      {/* On very narrow phones the mark alone carries the brand, so the header fits. */}
      <span className="hidden font-serif text-[1.75rem] leading-none tracking-wide min-[460px]:inline">Unsaid</span>
    </button>
  )
}
