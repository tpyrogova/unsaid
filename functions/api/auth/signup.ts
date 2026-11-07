import { signupRequestSchema } from '../../../shared/contract'
import { bytesToBase64 } from '../../../shared/encoding'
import { hashAuthKey, randomBytes } from '../../../server/crypto'
import type { Env } from '../../../server/env'
import { HttpError, json, readJson } from '../../../server/http'
import { createSession, toAccount, type UserRow } from '../../../server/session'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email, authKey, keys } = await readJson(request, signupRequestSchema)

  const authSalt = bytesToBase64(randomBytes(16))
  const user: UserRow = {
    id: crypto.randomUUID(),
    email,
    kdf_salt: keys.kdfSalt,
    auth_hash: await hashAuthKey(authKey, authSalt),
    auth_salt: authSalt,
    wrapped_dek: keys.wrappedDek,
    wrapped_dek_iv: keys.wrappedDekIv,
    created_at: Date.now(),
  }

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, email, kdf_salt, auth_hash, auth_salt, wrapped_dek, wrapped_dek_iv, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        user.id,
        user.email,
        user.kdf_salt,
        user.auth_hash,
        user.auth_salt,
        user.wrapped_dek,
        user.wrapped_dek_iv,
        user.created_at,
      )
      .run()
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      throw new HttpError(409, 'emailTaken')
    }
    throw error
  }

  const cookie = await createSession(request, env, user.id)
  return json(toAccount(user), { status: 201, headers: { 'Set-Cookie': cookie } })
}
