import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FRAMEWORKS,
  MAX_FOCUS_LENGTH,
  PERIODS,
  type FrameworkChoice,
  type FrameworkId,
  type PeriodId,
} from '../../shared/analysis'
import type { CategoryId } from '../../shared/categories'
import { Button } from '../components/Button'
import { analyzePeriod, entriesInPeriod } from '../lib/api'
import { useI18n } from '../i18n'
import type { JournalEntry } from '../types/journal'
import { ResultView, type ResultState } from './AnalysisScreen'

interface AnalyzePeriodScreenProps {
  entries: JournalEntry[]
  onBack: () => void
}

/**
 * The main feature: a careful review of a whole period, following
 * prompts/careful-review.md, with optional framework, topic and focus.
 */
export function AnalyzePeriodScreen({ entries, onBack }: AnalyzePeriodScreenProps) {
  const { t } = useI18n()
  const pt = t.period
  const [period, setPeriod] = useState<PeriodId>('month')
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [framework, setFramework] = useState<FrameworkChoice>('auto')
  const [focus, setFocus] = useState('')
  const [result, setResult] = useState<ResultState | null>(null)
  const controller = useRef<AbortController | null>(null)

  const inPeriod = useMemo(() => entriesInPeriod(entries, period), [entries, period])
  const selected = category ? inPeriod.filter((entry) => entry.category === category) : inPeriod
  const categories = useMemo(() => {
    const ids = new Set(entries.map((entry) => entry.category).filter((id): id is CategoryId => id !== undefined))
    return [...ids]
  }, [entries])

  async function run() {
    controller.current?.abort()
    controller.current = new AbortController()
    setResult({ status: 'loading' })
    try {
      const response = await analyzePeriod(
        { period, framework, focus, category: category ?? undefined, entries: selected },
        controller.current.signal,
      )
      setResult({ status: 'ready', result: response })
    } catch (error) {
      if (controller.current.signal.aborted) return
      setResult({ status: 'error', message: error instanceof Error ? error.message : pt.error })
    }
  }

  if (result) {
    const title = [t.labels.periods[period], category ? t.labels.categories[category] : null].filter(Boolean).join(' · ')
    return (
      <div className="space-y-12">
        <Button
          variant="ghost"
          onClick={() => {
            controller.current?.abort()
            setResult(null)
          }}
        >
          {pt.changeParams}
        </Button>
        <ResultView state={result} title={title} loadingHint={pt.loadingHint} />
      </div>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? 'bg-ink text-paper' : 'bg-sand hover:bg-line'
    }`

  return (
    <div className="space-y-10">
      <Button variant="ghost" onClick={onBack}>
        {t.common.backToJournal}
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{pt.title}</h1>
        <p className="leading-relaxed text-ink-soft">
          {pt.lead}
        </p>
      </header>

      <Field label={pt.period}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIODS) as PeriodId[]).map((id) => {
            const count = entriesInPeriod(entries, id).length
            return (
              <button key={id} type="button" className={chip(period === id)} disabled={count === 0} onClick={() => setPeriod(id)}>
                {t.labels.periods[id]} <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </Field>

      {categories.length > 0 && (
        <Field label={pt.topic} hint={pt.topicHint}>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(category === null)} onClick={() => setCategory(null)}>
              {pt.allTopics}
            </button>
            {categories.map((id) => (
              <button key={id} type="button" className={chip(category === id)} onClick={() => setCategory(id)}>
                {t.labels.categories[id]}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label={pt.method}>
        <div className="space-y-3 rounded-2xl bg-card p-5">
          <label className="flex cursor-pointer gap-3">
            <input
              type="radio"
              name="framework"
              checked={framework === 'auto'}
              onChange={() => setFramework('auto')}
              className="mt-1 accent-clay"
            />
            <span>
              <span className="font-medium">{pt.ourMethod}</span>
              <span className="block text-sm text-ink-soft">
                {pt.ourMethodHint}
              </span>
            </span>
          </label>
          <details open={framework !== 'auto'} className="pl-7">
            <summary className="cursor-pointer text-sm text-ink-soft">{pt.otherFramework}</summary>
            <div className="mt-3 space-y-2">
              {(Object.keys(FRAMEWORKS) as FrameworkId[]).map((id) => (
                <label key={id} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="framework"
                    checked={framework === id}
                    onChange={() => setFramework(id)}
                    className="accent-clay"
                  />
                  {t.labels.frameworks[id]}
                </label>
              ))}
            </div>
          </details>
        </div>
      </Field>

      <Field label={pt.focus} hint={pt.focusHint}>
        <textarea
          value={focus}
          onChange={(event) => setFocus(event.target.value.slice(0, MAX_FOCUS_LENGTH))}
          rows={2}
          className="block w-full resize-y rounded-xl border border-line bg-card px-4 py-3 focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
        />
      </Field>

      <div className="space-y-3">
        <Button onClick={run} disabled={selected.length === 0}>
          {pt.run(selected.length)}
        </Button>
        <p className="text-sm leading-relaxed text-ink-soft">
          {pt.privacy}
        </p>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">{label}</h2>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
