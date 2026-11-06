import { hashAuthKey, timingSafeEqual } from './crypto'
import type { Env } from './env'
import { HttpError } from './http'
import { assertLoginAllowed, clearFailedLogins, recordFailedLogin } from './rateLimit'
import type { UserRow } from './session'

/**
 * A valid session is not enough for irreversible actions: the password is
 * checked again (as authKey), with the same rate limit as login.
 */
export async function assertPassword(env: Env, user: UserRow, authKey: string): Promise<void> {
  await assertLoginAllowed(env, user.email)
  if (!timingSafeEqual(await hashAuthKey(authKey, user.auth_salt), user.auth_hash)) {
    await recordFailedLogin(env, user.email)
    throw new HttpError(403, 'Неверный пароль')
  }
  await clearFailedLogins(env, user.email)
}
