import { loginRequestSchema } from '../../../shared/contract'
import { hashAuthKey, timingSafeEqual } from '../../../server/crypto'
import type { Env } from '../../../server/env'
import { HttpError, json, readJson } from '../../../server/http'
import { assertLoginAllowed, clearFailedLogins, recordFailedLogin } from '../../../server/rateLimit'
import { createSession, toAccount, type UserRow } from '../../../server/session'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email, authKey } = await readJson(request, loginRequestSchema)
  await assertLoginAllowed(env, email)

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>()
  const valid =
    user !== null && timingSafeEqual(await hashAuthKey(authKey, user.auth_salt), user.auth_hash)

  if (!user || !valid) {
    await recordFailedLogin(env, email)
    // Same message for "no such user" and "wrong password".
    throw new HttpError(401, 'wrongCredentials')
  }

  await clearFailedLogins(env, email)
  const cookie = await createSession(request, env, user.id)
  return json(toAccount(user), { headers: { 'Set-Cookie': cookie } })
}
