import type { Env } from './env'

/**
 * Deletes entries and remembers their ids, so re-importing the same export
 * does not resurrect them.
 */
export async function deleteEntries(env: Env, userId: string, ids: string[]): Promise<number> {
  const now = Date.now()
  const statements = ids.flatMap((id) => [
    env.DB.prepare('DELETE FROM entries WHERE user_id = ? AND id = ?').bind(userId, id),
    env.DB.prepare('INSERT OR IGNORE INTO deleted_entries (user_id, id, deleted_at) VALUES (?, ?, ?)').bind(
      userId,
      id,
      now,
    ),
  ])
  const results = await env.DB.batch(statements)
  // Even indexes are the DELETEs.
  return results.reduce((sum, result, i) => sum + (i % 2 === 0 ? (result.meta.changes ?? 0) : 0), 0)
}
