import { Button } from '../components/Button'
import { formatEntryDate } from '../lib/format'
import type { JournalEntry } from '../types/journal'

interface EntryDetailScreenProps {
  entry: JournalEntry
  onBack: () => void
  onAnalyze: (text: string) => void
}

export function EntryDetailScreen({ entry, onBack, onAnalyze }: EntryDetailScreenProps) {
  return (
    <article className="space-y-8">
      <Button variant="ghost" onClick={onBack}>
        ← К дневнику
      </Button>

      <header className="space-y-2">
        <p className="text-sm tracking-wide text-ink-soft uppercase">{formatEntryDate(entry.date)}</p>
        {entry.title && <h1 className="font-serif text-3xl leading-tight">{entry.title}</h1>}
      </header>

      <div className="font-serif text-lg leading-relaxed whitespace-pre-line">{entry.text}</div>

      {entry.mediaCount > 0 && (
        <p className="text-sm text-ink-soft">В оригинале есть вложения ({entry.mediaCount}), они не импортировались.</p>
      )}

      <Button onClick={() => onAnalyze(entry.text)}>Разобрать</Button>
    </article>
  )
}
