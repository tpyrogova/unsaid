import type { CategoryId } from '../../shared/categories'

/** A decrypted journal entry, as the UI sees it. Exists only in memory. */
export interface JournalEntry {
  id: string
  /** Calendar date of the entry, `YYYY-MM-DD`. */
  date: string
  title: string | null
  text: string
  source: 'apple-journal' | 'manual'
  /** Photos/videos/maps attached in the source app (not imported yet). */
  mediaCount: number
  /** Set by categorization; absent until the entry has been categorized. */
  category?: CategoryId
  /** Model's reason to consider the entry junk; `null` once reviewed or if not junk. */
  junkReason?: string | null
  /** When the entry was categorized (ms). Absent = still to do. */
  categorizedAt?: number
}
