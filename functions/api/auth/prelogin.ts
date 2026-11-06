import { preloginRequestSchema } from '../../../shared/contract'
import { decoySalt } from '../../../server/crypto'
import type { Env } from '../../../server/env'
import { HttpError, json, readJson } from '../../../server/http'

/** Returns the KDF salt the browser needs to derive keys from the password. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email } = await readJson(request, preloginRequestSchema)

  const user = await env.DB.prepare('SELECT kdf_salt FROM users WHERE email = ?')
    .bind(email)
    .first<{ kdf_salt: string }>()
  if (user) return json({ kdfSalt: user.kdf_salt })

  if (!env.SALT_SECRET) throw new HttpError(500, 'Сервер не настроен: нет SALT_SECRET')
  return json({ kdfSalt: await decoySalt(env.SALT_SECRET, email) })
}
