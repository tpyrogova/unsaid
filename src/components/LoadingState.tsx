export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 py-24">
      <span className="relative flex size-4">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-clay/40" />
        <span className="relative inline-flex size-4 rounded-full bg-clay" />
      </span>
      <p className="font-serif text-lg text-ink-soft">Вчитываюсь в запись…</p>
    </div>
  )
}
