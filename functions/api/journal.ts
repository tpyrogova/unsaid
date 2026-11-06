import { reauthRequestSchema } from '../../shared/contract'
import type { Env } from '../../server/env'
import { json, readJson } from '../../server/http'
import { assertPassword } from '../../server/reauth'
import { requireUser } from '../../server/session'

/**
 * «Очистить дневник»: deletes every entry, and also the list of previously
 * deleted ids, so the account starts from scratch and a fresh import works fully.
 * The account itself (and its keys) stays.
 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { authKey } = await readJson(request, reauthRequestSchema)
  await assertPassword(env, user, authKey)

  const [entries] = await env.DB.batch([
    env.DB.prepare('DELETE FROM entries WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM deleted_entries WHERE user_id = ?').bind(user.id),
  ])
  return json({ deleted: entries?.meta.changes ?? 0 })
}
