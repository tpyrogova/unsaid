import {
  deleteEntriesRequestSchema,
  updateEntriesRequestSchema,
  uploadEntriesRequestSchema,
  type StoredEntry,
} from '../../../shared/contract'
import { deleteEntries } from '../../../server/entries'
import type { ApiHandler } from '../../../server/handler'
import { json, readJson } from '../../../server/http'
import { requireUser } from '../../../server/session'

interface EntryRow {
  id: string
  ciphertext: string
  iv: string
  created_at: number
}

export const onRequestGet: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { results } = await env.DB.prepare(
    'SELECT id, ciphertext, iv, created_at FROM entries WHERE user_id = ?',
  )
    .bind(user.id)
    .all<EntryRow>()

  const entries: StoredEntry[] = results.map((row) => ({
    id: row.id,
    ciphertext: row.ciphertext,
    iv: row.iv,
    createdAt: row.created_at,
  }))
  return json({ entries })
}

/**
 * Stores a batch of new encrypted entries. Skips ids that already exist and
 * ids the user previously deleted (so a re-import does not resurrect them).
 */
export const onRequestPost: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { entries } = await readJson(request, uploadEntriesRequestSchema)

  const now = Date.now()
  const insert = env.DB.prepare(
    `INSERT OR IGNORE INTO entries (user_id, id, ciphertext, iv, created_at)
     SELECT ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM deleted_entries WHERE user_id = ? AND id = ?)`,
  )
  const results = await env.DB.batch(
    entries.map((entry) => insert.bind(user.id, entry.id, entry.ciphertext, entry.iv, now, user.id, entry.id)),
  )
  const inserted = results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0)

  return json({ inserted }, { status: 201 })
}

/** Replaces the ciphertext of existing entries (e.g. after categorization). */
export const onRequestPut: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { entries } = await readJson(request, updateEntriesRequestSchema)

  const update = env.DB.prepare('UPDATE entries SET ciphertext = ?, iv = ? WHERE user_id = ? AND id = ?')
  const results = await env.DB.batch(
    entries.map((entry) => update.bind(entry.ciphertext, entry.iv, user.id, entry.id)),
  )
  const updated = results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0)

  return json({ updated })
}

/** Bulk delete (e.g. confirmed junk entries). */
export const onRequestDelete: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { ids } = await readJson(request, deleteEntriesRequestSchema)
  return json({ deleted: await deleteEntries(env, user.id, ids) })
}
