import type { ApiHandler } from '../../../server/handler'
import { json } from '../../../server/http'
import { destroySession } from '../../../server/session'

export const onRequestPost: ApiHandler = async ({ request, env }) => {
  const cookie = await destroySession(request, env)
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } })
}
