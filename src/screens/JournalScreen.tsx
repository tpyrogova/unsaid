import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, type CategoryId } from '../../shared/categories'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { needsCategorization } from '../lib/categorize'
import type { VaultKeys } from '../lib/crypto'
import { formatEntryDate, pluralRu } from '../lib/format'
import { loadJournal, type LoadedJournal } from '../lib/journal'
import type { JournalEntry } from '../types/journal'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; journal: LoadedJournal }
  | { status: 'error'; message: string }

interface JournalScreenProps {
  vault: VaultKeys
  onOpenEntry: (entry: JournalEntry) => void
  onImport: () => void
  onWrite: () => void
  onCategorize: (entries: JournalEntry[]) => void
  onAnalyze: (entries: JournalEntry[]) => void
}

const PREVIEW_LENGTH = 160

export function JournalScreen({
  vault,
  onOpenEntry,
  onImport,
  onWrite,
  onCategorize,
  onAnalyze,
}: JournalScreenProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadJournal(vault)
      .then((journal) => !cancelled && setState({ status: 'ready', journal }))
      .catch(
        (err: unknown) =>
          !cancelled &&
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Не удалось загрузить дневник.' }),
      )
    return () => {
      cancelled = true
    }
  }, [vault])

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Мой дневник</h1>
        <div className="flex flex-wrap gap-3">
          {state.status === 'ready' && state.journal.entries.length > 0 && (
            <CategorizeButton entries={state.journal.entries} onClick={() => onCategorize(state.journal.entries)} />
          )}
          <Button variant="secondary" onClick={onImport}>
            Импорт
          </Button>
          <Button variant="secondary" onClick={onWrite}>
            Написать
          </Button>
          {state.status === 'ready' && state.journal.entries.length > 0 && (
            <Button onClick={() => onAnalyze(state.journal.entries)}>Анализировать</Button>
          )}
        </div>
      </header>

      {state.status === 'loading' && <p className="py-12 text-center text-ink-soft">Расшифровываю записи…</p>}
      {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}
      {state.status === 'ready' && (
        <EntryList journal={state.journal} onOpenEntry={onOpenEntry} onImport={onImport} />
      )}
    </div>
  )
}

interface EntryListProps {
  journal: LoadedJournal
  onOpenEntry: (entry: JournalEntry) => void
  onImport: () => void
}

function EntryList({ journal, onOpenEntry, onImport }: EntryListProps) {
  const { entries, unreadable } = journal
  const [filter, setFilter] = useState<CategoryId | null>(null)
  const visible = filter ? entries.filter((entry) => entry.category === filter) : entries

  if (entries.length === 0) {
    return (
      <div className="space-y-5 rounded-3xl bg-card px-6 py-12 text-center">
        <p className="font-serif text-xl">Здесь пока пусто</p>
        <p className="text-ink-soft">Напишите первую запись или загрузите ваш дневник с iPhone.</p>
        <Button variant="secondary" onClick={onImport}>
          Загрузить дневник с iPhone
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CategoryFilter entries={entries} active={filter} onChange={setFilter} />
      <p className="text-sm text-ink-soft">
        {visible.length} {pluralRu(visible.length, ['запись', 'записи', 'записей'])}
      </p>
      {unreadable > 0 && (
        <Notice tone="error">
          {unreadable} {pluralRu(unreadable, ['запись не удалось', 'записи не удалось', 'записей не удалось'])}{' '}
          расшифровать.
        </Notice>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {visible.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onOpenEntry(entry)}
              className="block w-full space-y-1.5 px-5 py-4 text-left transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-none"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-wide text-ink-soft uppercase">
                {formatEntryDate(entry.date)}
                {entry.category && (
                  <span className="rounded-full bg-sand px-2 py-0.5 tracking-normal normal-case">
                    {CATEGORIES[entry.category]}
                  </span>
                )}
              </p>
              {entry.title && <p className="font-medium">{entry.title}</p>}
              <p className="line-clamp-2 font-serif leading-relaxed text-ink/90">
                {entry.text.slice(0, PREVIEW_LENGTH)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CategorizeButton({ entries, onClick }: { entries: JournalEntry[]; onClick: () => void }) {
  const pending = entries.filter(needsCategorization).length
  return (
    <Button variant="secondary" onClick={onClick}>
      Категоризировать
      {pending > 0 && pending < entries.length && (
        <span className="ml-2 rounded-full bg-clay-soft px-2 py-0.5 text-xs text-clay-deep">+{pending}</span>
      )}
    </Button>
  )
}

interface CategoryFilterProps {
  entries: JournalEntry[]
  active: CategoryId | null
  onChange: (category: CategoryId | null) => void
}

function CategoryFilter({ entries, active, onChange }: CategoryFilterProps) {
  const counts = useMemo(() => {
    const result = new Map<CategoryId, number>()
    for (const entry of entries) if (entry.category) result.set(entry.category, (result.get(entry.category) ?? 0) + 1)
    return [...result.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  if (counts.length === 0) return null

  const chip = (selected: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm transition-colors ${selected ? 'bg-ink text-paper' : 'bg-sand text-ink hover:bg-line'}`

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по темам">
      <button type="button" aria-pressed={active === null} className={chip(active === null)} onClick={() => onChange(null)}>
        Все
      </button>
      {counts.map(([id, n]) => (
        <button key={id} type="button" aria-pressed={active === id} className={chip(active === id)} onClick={() => onChange(id)}>
          {CATEGORIES[id]} <span className="opacity-60">{n}</span>
        </button>
      ))}
    </div>
  )
}
