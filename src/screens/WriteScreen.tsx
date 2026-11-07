import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n'
import { todayIso } from '../lib/format'

/** How the entry should be saved; omitted in demo mode (nothing is saved). */
export interface SaveHandler {
  (entry: { date: string; text: string }, then: 'journal' | 'analyze'): Promise<void>
}

interface WriteScreenProps {
  text: string
  onTextChange: (text: string) => void
  /** Demo: analyse without saving. */
  onAnalyzeOnly: () => void
  /** Signed-in: save to the journal (optionally followed by a review). */
  onSave?: SaveHandler
  onBack: () => void
  backLabel: string
}

export function WriteScreen({ text, onTextChange, onAnalyzeOnly, onSave, onBack, backLabel }: WriteScreenProps) {
  const { t } = useI18n()
  const w = t.write
  const [date, setDate] = useState(todayIso)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEmpty = text.trim().length === 0

  async function save(then: 'journal' | 'analyze') {
    if (!onSave || isEmpty) return
    setBusy(true)
    setError(null)
    try {
      await onSave({ date, text }, then)
    } catch (err) {
      setError(err instanceof Error ? err.message : w.saveError)
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isEmpty) return
    if (onSave) void save('journal')
    else onAnalyzeOnly()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Button variant="ghost" onClick={onBack}>
        ← {backLabel}
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{w.title}</h1>
        <p className="leading-relaxed text-ink-soft">
          {w.lead}
        </p>
      </header>

      {onSave && (
        <label className="block max-w-xs space-y-1.5">
          <span className="block text-sm font-medium">{w.date}</span>
          <input
            type="date"
            value={date}
            max={todayIso()}
            required
            onChange={(event) => setDate(event.target.value)}
            className="block w-full rounded-xl border border-line bg-card px-4 py-3 focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
          />
        </label>
      )}

      <label className="block">
        <span className="sr-only">{w.textLabel}</span>
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={12}
          placeholder={w.placeholder}
          className="block min-h-[50dvh] w-full resize-y rounded-2xl border border-line bg-card p-5 font-serif text-lg leading-relaxed shadow-[0_1px_0_rgba(59,47,42,0.04)] placeholder:text-ink-soft/60 focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
        />
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      {onSave ? (
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">{w.saveNote}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={isEmpty || busy} onClick={() => save('analyze')}>
              {w.saveAndReview}
            </Button>
            <Button type="submit" disabled={isEmpty || busy}>
              {busy ? w.saving : w.save}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">{w.demoNote}</p>
          <Button type="submit" disabled={isEmpty}>
            {w.review}
          </Button>
        </div>
      )}
    </form>
  )
}
