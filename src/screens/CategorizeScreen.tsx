import { useMemo, useState } from 'react'
import { MAX_ENTRIES_PER_CATEGORIZE, type CategoryId } from '../../shared/categories'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import {
  categorizeJournal,
  isJunkCandidate,
  needsCategorization,
  type CategorizeProgress,
} from '../lib/categorize'
import type { VaultKeys } from '../lib/crypto'
import { useI18n } from '../i18n'
import { formatEntryDate } from '../lib/format'
import { deleteEntries, updateEntries } from '../lib/journal'
import type { JournalEntry } from '../types/journal'

type Step =
  | { name: 'intro' }
  | { name: 'running'; progress: CategorizeProgress }
  | { name: 'review' }
  | { name: 'finishing' }

interface CategorizeScreenProps {
  vault: VaultKeys
  entries: JournalEntry[]
  onBack: () => void
  onDone: () => void
}

/** Rough per-batch latency observed with Qwen on Workers AI. */
const SECONDS_PER_BATCH = 40

export function CategorizeScreen({ vault, entries: initialEntries, onBack, onDone }: CategorizeScreenProps) {
  const { t } = useI18n()
  const [entries, setEntries] = useState(initialEntries)
  const [step, setStep] = useState<Step>(() =>
    initialEntries.some(needsCategorization) ? { name: 'intro' } : { name: 'review' },
  )
  const [error, setError] = useState<string | null>(null)

  const pending = entries.filter(needsCategorization).length

  async function run() {
    setError(null)
    setStep({ name: 'running', progress: { done: 0, total: pending, batch: 1, batches: 1 } })
    try {
      const updated = await categorizeJournal(vault, entries, {
        onProgress: (progress) => setStep({ name: 'running', progress }),
        // Keep local state in sync so a retry after an error skips saved batches.
        onSaved: (saved) =>
          setEntries((current) => {
            const byId = new Map(saved.map((entry) => [entry.id, entry]))
            return current.map((entry) => byId.get(entry.id) ?? entry)
          }),
      })
      setEntries(updated)
      setStep({ name: 'review' })
    } catch (err) {
      setError(
        t.categorize.runError(err instanceof Error ? err.message : t.categorize.runErrorFallback),
      )
      setStep({ name: 'intro' })
    }
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onBack} disabled={step.name === 'running' || step.name === 'finishing'}>
        {t.common.backToJournal}
      </Button>

      <header className="space-y-3">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{t.categorize.title}</h1>
        <p className="leading-relaxed text-ink-soft">
          {t.categorize.lead}
        </p>
      </header>

      {error && <Notice tone="error">{error}</Notice>}

      {step.name === 'intro' && <Intro pending={pending} total={entries.length} onStart={run} />}
      {step.name === 'running' && <Running progress={step.progress} />}
      {(step.name === 'review' || step.name === 'finishing') && (
        <Review
          entries={entries}
          busy={step.name === 'finishing'}
          onFinish={async (toDelete, toKeep) => {
            setError(null)
            setStep({ name: 'finishing' })
            try {
              if (toDelete.length > 0) await deleteEntries(toDelete)
              // Kept junk candidates are marked as reviewed so they don't come up again.
              if (toKeep.length > 0) await updateEntries(vault, toKeep.map((entry) => ({ ...entry, junkReason: null })))
              onDone()
            } catch (err) {
              setError(err instanceof Error ? err.message : t.categorize.saveError)
              setStep({ name: 'review' })
            }
          }}
        />
      )}
    </div>
  )
}

function Intro({ pending, total, onStart }: { pending: number; total: number; onStart: () => void }) {
  const { t } = useI18n()
  const batches = Math.ceil(pending / MAX_ENTRIES_PER_CATEGORIZE)
  const minutes = Math.max(1, Math.round((batches * SECONDS_PER_BATCH) / 60))

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl bg-card p-6">
        <p className="font-serif text-xl">
          {pending === total
            ? t.common.entries(pending)
            : t.categorize.remaining(pending, total)}
        </p>
        <ul className="flex flex-wrap gap-2">
          {Object.values(t.labels.categories).map((label) => (
            <li key={label} className="rounded-full bg-sand px-3 py-1 text-sm">
              {label}
            </li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed text-ink-soft">
          {t.categorize.info(minutes, MAX_ENTRIES_PER_CATEGORIZE)}
        </p>
      </div>
      <Button onClick={onStart}>{t.categorize.start}</Button>
    </div>
  )
}

function Running({ progress }: { progress: CategorizeProgress }) {
  const { t } = useI18n()
  const percent = Math.round((progress.done / Math.max(progress.total, 1)) * 100)
  return (
    <div className="space-y-3 rounded-3xl bg-card p-6" role="status" aria-live="polite">
      <div className="h-2 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-sage transition-[width] duration-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-ink-soft">
        {t.categorize.batch(progress.batch, progress.batches, progress.done, progress.total)}
      </p>
      <p className="text-sm text-ink-soft">{t.categorize.keepTab}</p>
    </div>
  )
}

interface ReviewProps {
  entries: JournalEntry[]
  busy: boolean
  onFinish: (toDelete: string[], toKeep: JournalEntry[]) => void
}

function Review({ entries, busy, onFinish }: ReviewProps) {
  const { t } = useI18n()
  const junk = useMemo(() => entries.filter(isJunkCandidate), [entries])
  const counts = useMemo(() => {
    const result = new Map<CategoryId, number>()
    for (const entry of entries) if (entry.category) result.set(entry.category, (result.get(entry.category) ?? 0) + 1)
    return [...result.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  // Nothing is preselected: deleting is irreversible.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const max = Math.max(1, ...counts.map(([, n]) => n))

  function toggle(id: string) {
    setConfirming(false)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function finish() {
    if (selected.size > 0 && !confirming) {
      setConfirming(true)
      return
    }
    onFinish([...selected], junk.filter((entry) => !selected.has(entry.id)))
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">{t.categorize.topics}</h2>
        <ul className="space-y-3">
          {counts.map(([id, n]) => (
            <li key={id} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_3rem]">
              <span>{t.labels.categories[id]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-sand">
                <span className="block h-full rounded-full bg-clay" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="text-right text-ink-soft tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl">{t.categorize.junk}</h2>
          <p className="text-sm text-ink-soft">
            {junk.length === 0
              ? t.categorize.noJunk
              : t.categorize.junkHint}
          </p>
        </div>

        {junk.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {junk.map((entry) => (
              <li key={entry.id}>
                <label className="flex cursor-pointer gap-4 px-5 py-4 hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={() => toggle(entry.id)}
                    className="mt-1 size-4 shrink-0 accent-clay"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block text-xs tracking-wide text-ink-soft uppercase">
                      {formatEntryDate(entry.date)} · {entry.junkReason}
                    </span>
                    <span className="line-clamp-2 block font-serif leading-relaxed">{entry.text}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirming && (
        <Notice tone="error">
          {t.categorize.confirmDelete(selected.size)}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={finish} disabled={busy}>
          {busy
            ? t.categorize.saving
            : selected.size === 0
              ? t.categorize.done
              : confirming
                ? t.categorize.confirmYes(selected.size)
                : t.categorize.deleteSelected(selected.size)}
        </Button>
        {confirming && (
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t.common.cancel}
          </Button>
        )}
      </div>
    </div>
  )
}
