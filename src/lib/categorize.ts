/**
 * Client side of journal categorization.
 *
 * Runs once per entry: only entries without `categorizedAt` are sent. Batches
 * go to the model one by one, and each batch is encrypted and saved right
 * away, so an interrupted run loses nothing and a re-run continues where it
 * stopped.
 */
import {
  categorizeResponseSchema,
  MAX_CATEGORIZE_TEXT_LENGTH,
  MAX_ENTRIES_PER_CATEGORIZE,
} from '../../shared/categories'
import type { JournalEntry } from '../types/journal'
import type { VaultKeys } from './crypto'
import { apiRequest } from './http'
import { updateEntries } from './journal'

export function needsCategorization(entry: JournalEntry): boolean {
  return entry.categorizedAt === undefined
}

export function isJunkCandidate(entry: JournalEntry): boolean {
  return typeof entry.junkReason === 'string' && entry.junkReason.length > 0
}

/** Title + the beginning of the text: enough to tell the topic, cheaper in tokens. */
export function textForModel(entry: JournalEntry): string {
  const full = entry.title ? `${entry.title}\n${entry.text}` : entry.text
  return full.slice(0, MAX_CATEGORIZE_TEXT_LENGTH).trim()
}

export interface CategorizeProgress {
  done: number
  total: number
  batch: number
  batches: number
}

/**
 * Categorizes all pending entries and returns the full, updated list.
 * On failure, everything finished so far is already saved; `onSaved` lets the
 * caller keep its own state in sync batch by batch.
 */
export async function categorizeJournal(
  vault: VaultKeys,
  entries: JournalEntry[],
  callbacks: {
    onProgress?: (progress: CategorizeProgress) => void
    onSaved?: (updated: JournalEntry[]) => void
  } = {},
): Promise<JournalEntry[]> {
  const pending = entries.filter(needsCategorization)
  const batches = Math.ceil(pending.length / MAX_ENTRIES_PER_CATEGORIZE)
  const byId = new Map(entries.map((entry) => [entry.id, entry]))

  for (let i = 0; i < batches; i++) {
    const batch = pending.slice(i * MAX_ENTRIES_PER_CATEGORIZE, (i + 1) * MAX_ENTRIES_PER_CATEGORIZE)
    callbacks.onProgress?.({ done: i * MAX_ENTRIES_PER_CATEGORIZE, total: pending.length, batch: i + 1, batches })

    const { results } = await apiRequest('/api/categorize', {
      method: 'POST',
      body: { entries: batch.map((entry) => ({ id: entry.id, text: textForModel(entry) })) },
      schema: categorizeResponseSchema,
    })

    const now = Date.now()
    const updated: JournalEntry[] = []
    for (const result of results) {
      const entry = byId.get(result.id)
      if (!entry) continue
      const next = { ...entry, category: result.category, junkReason: result.junkReason, categorizedAt: now }
      byId.set(entry.id, next)
      updated.push(next)
    }
    // Entries the model skipped stay pending and are picked up next run.
    if (updated.length > 0) {
      await updateEntries(vault, updated)
      callbacks.onSaved?.(updated)
    }
  }

  callbacks.onProgress?.({ done: pending.length, total: pending.length, batch: batches, batches })
  return entries.map((entry) => byId.get(entry.id) ?? entry)
}
