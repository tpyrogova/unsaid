import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
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
      setError(err instanceof Error ? err.message : 'Не удалось сохранить запись.')
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
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Что сегодня на душе?</h1>
        <p className="leading-relaxed text-ink-soft">
          Напишите как есть, без редактуры. Разбор покажет чувства и потребности, привычные ловушки мышления
          и повторяющиеся сценарии, каждый раз со ссылкой на ваши собственные слова.
        </p>
      </header>

      {onSave && (
        <label className="block max-w-xs space-y-1.5">
          <span className="block text-sm font-medium">Дата записи</span>
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
        <span className="sr-only">Запись в дневнике</span>
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={12}
          placeholder="Сегодня я…"
          className="block min-h-[50dvh] w-full resize-y rounded-2xl border border-line bg-card p-5 font-serif text-lg leading-relaxed shadow-[0_1px_0_rgba(59,47,42,0.04)] placeholder:text-ink-soft/60 focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
        />
      </label>

      {error && <Notice tone="error">{error}</Notice>}

      {onSave ? (
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">Запись зашифруется на вашем устройстве и добавится в дневник.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={isEmpty || busy} onClick={() => save('analyze')}>
              Сохранить и разобрать
            </Button>
            <Button type="submit" disabled={isEmpty || busy}>
              {busy ? 'Сохраняю…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">Текст остаётся только в этой вкладке.</p>
          <Button type="submit" disabled={isEmpty}>
            Разобрать
          </Button>
        </div>
      )}
    </form>
  )
}
