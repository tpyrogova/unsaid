import type { Env } from '../../../server/env'
import { json } from '../../../server/http'
import { destroySession } from '../../../server/session'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = await destroySession(request, env)
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } })
}
