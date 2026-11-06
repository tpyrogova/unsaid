/**
 * Encrypted journal storage: everything is encrypted before upload and
 * decrypted after download, in the browser.
 */
import { z } from 'zod'
import { categoryIdSchema } from '../../shared/categories'
import {
  deleteEntriesResponseSchema,
  listEntriesResponseSchema,
  MAX_ENTRIES_PER_DELETE,
  MAX_ENTRIES_PER_UPLOAD,
  updateEntriesResponseSchema,
  uploadEntriesResponseSchema,
  type StoredEntry,
} from '../../shared/contract'
import type { JournalEntry } from '../types/journal'
import { decryptJson, encryptJson, entryIdForSource, type VaultKeys } from './crypto'
import { apiRequest } from './http'
import type { ImportedEntry } from './importers/appleJournal'

/** What is inside each ciphertext. Versioned for future migrations. */
const entryPayloadSchema = z.object({
  v: z.literal(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().nullable(),
  text: z.string(),
  source: z.enum(['apple-journal', 'manual']),
  mediaCount: z.number().int().nonnegative(),
  // Added by categorization; optional so older payloads stay valid.
  category: categoryIdSchema.optional(),
  junkReason: z.string().nullable().optional(),
  categorizedAt: z.number().optional(),
})
type EntryPayload = z.infer<typeof entryPayloadSchema>

function toPayload(entry: Omit<JournalEntry, 'id'>): EntryPayload {
  return {
    v: 1,
    date: entry.date,
    title: entry.title,
    text: entry.text,
    source: entry.source,
    mediaCount: entry.mediaCount,
    category: entry.category,
    junkReason: entry.junkReason,
    categorizedAt: entry.categorizedAt,
  }
}

/** Keeps each request well under Workers' body limits. */
const UPLOAD_BATCH_SIZE = Math.min(25, MAX_ENTRIES_PER_UPLOAD)

export interface LoadedJournal {
  entries: JournalEntry[]
  /** Entries that failed to decrypt or validate. Should normally be 0. */
  unreadable: number
}

export async function loadJournal(vault: VaultKeys): Promise<LoadedJournal> {
  const { entries: stored } = await apiRequest('/api/entries', { schema: listEntriesResponseSchema })

  const decrypted = await Promise.all(stored.map((entry) => decryptEntry(vault, entry)))
  const entries = decrypted.filter((entry): entry is JournalEntry => entry !== null)
  entries.sort((a, b) => b.date.localeCompare(a.date))

  return { entries, unreadable: stored.length - entries.length }
}

async function decryptEntry(vault: VaultKeys, stored: StoredEntry): Promise<JournalEntry | null> {
  try {
    const { v: _version, ...payload } = entryPayloadSchema.parse(await decryptJson(vault, stored))
    return { id: stored.id, ...payload }
  } catch {
    return null
  }
}

export interface UploadProgress {
  done: number
  total: number
}

/**
 * Encrypts and uploads imported entries in batches.
 * Re-importing the same export is safe: ids are deterministic and the
 * server ignores ones it already has.
 */
export async function saveImportedEntries(
  vault: VaultKeys,
  imported: ImportedEntry[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ inserted: number }> {
  let inserted = 0
  for (let start = 0; start < imported.length; start += UPLOAD_BATCH_SIZE) {
    const batch = imported.slice(start, start + UPLOAD_BATCH_SIZE)
    const encrypted = await Promise.all(
      batch.map(async (entry) => {
        const id = await entryIdForSource(vault, entry.sourceKey)
        const payload = toPayload({
          date: entry.date,
          title: entry.title,
          text: entry.text,
          source: 'apple-journal',
          mediaCount: entry.mediaCount,
        })
        return encryptJson(vault, id, payload)
      }),
    )
    const result = await apiRequest('/api/entries', {
      method: 'POST',
      body: { entries: encrypted },
      schema: uploadEntriesResponseSchema,
    })
    inserted += result.inserted
    onProgress?.({ done: start + batch.length, total: imported.length })
  }
  return { inserted }
}

/** Re-encrypts and saves changed entries (e.g. new category). */
export async function updateEntries(vault: VaultKeys, entries: JournalEntry[]): Promise<void> {
  for (let start = 0; start < entries.length; start += UPLOAD_BATCH_SIZE) {
    const batch = entries.slice(start, start + UPLOAD_BATCH_SIZE)
    const encrypted = await Promise.all(batch.map(({ id, ...entry }) => encryptJson(vault, id, toPayload(entry))))
    await apiRequest('/api/entries', {
      method: 'PUT',
      body: { entries: encrypted },
      schema: updateEntriesResponseSchema,
    })
  }
}

/** Deletes entries for good. Re-importing the same export will not restore them. */
export async function deleteEntries(ids: string[]): Promise<number> {
  let deleted = 0
  for (let start = 0; start < ids.length; start += MAX_ENTRIES_PER_DELETE) {
    const result = await apiRequest('/api/entries', {
      method: 'DELETE',
      body: { ids: ids.slice(start, start + MAX_ENTRIES_PER_DELETE) },
      schema: deleteEntriesResponseSchema,
    })
    deleted += result.deleted
  }
  return deleted
}

/**
 * Saves an entry written in the app. Random id: it never collides with
 * imported entries, so later imports cannot overwrite it.
 */
export async function saveManualEntry(
  vault: VaultKeys,
  entry: { date: string; text: string },
): Promise<JournalEntry> {
  const saved: JournalEntry = {
    id: crypto.randomUUID(),
    date: entry.date,
    title: null,
    text: entry.text.trim(),
    source: 'manual',
    mediaCount: 0,
  }
  const { id, ...rest } = saved
  await apiRequest('/api/entries', {
    method: 'POST',
    body: { entries: [await encryptJson(vault, id, toPayload(rest))] },
    schema: uploadEntriesResponseSchema,
  })
  return saved
}
