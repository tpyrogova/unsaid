import { reauthRequestSchema } from '../../shared/contract'
import type { ApiHandler } from '../../server/handler'
import { json, readJson } from '../../server/http'
import { assertPassword } from '../../server/reauth'
import { destroySession, requireUser } from '../../server/session'

/**
 * «Удалить аккаунт и все данные»: removes every row tied to the user.
 * Tables are cleared explicitly instead of relying on ON DELETE CASCADE, so
 * the guarantee does not depend on foreign-key enforcement being enabled.
 */
export const onRequestDelete: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { authKey } = await readJson(request, reauthRequestSchema)
  await assertPassword(env, user, authKey)

  const byUser = ['entries', 'deleted_entries', 'usage_log', 'safety_events', 'sessions']
  await env.DB.batch([
    ...byUser.map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(user.id)),
    env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ])

  const cookie = await destroySession(request, env)
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } })
}
