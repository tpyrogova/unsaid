import { bytesToBase64, utf8 } from '../shared/encoding'
import { randomToken, sha256 } from './crypto'
import type { Env } from './env'
import { HttpError } from './http'

const COOKIE_NAME = 'unsaid_session'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export interface UserRow {
  id: string
  email: string
  kdf_salt: string
  auth_hash: string
  auth_salt: string
  wrapped_dek: string
  wrapped_dek_iv: string
  created_at: number
}

async function hashToken(token: string): Promise<string> {
  return bytesToBase64(await sha256(utf8(token)))
}

/** `Secure` cookies are rejected by some browsers on plain-http localhost. */
function isLocalhost(request: Request): boolean {
  const { hostname } = new URL(request.url)
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function serializeCookie(request: Request, value: string, maxAge: number): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ]
  if (!isLocalhost(request)) parts.push('Secure')
  return parts.join('; ')
}

function readCookie(request: Request): string | null {
  const header = request.headers.get('Cookie') ?? ''
  for (const pair of header.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (name === COOKIE_NAME) return rest.join('=') || null
  }
  return null
}

/** Creates a session and returns the `Set-Cookie` header value. */
export async function createSession(request: Request, env: Env, userId: string): Promise<string> {
  const token = randomToken()
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await hashToken(token), userId, expiresAt)
    .run()
  return serializeCookie(request, token, SESSION_TTL_SECONDS)
}

/** Deletes the current session (if any) and returns a clearing `Set-Cookie`. */
export async function destroySession(request: Request, env: Env): Promise<string> {
  const token = readCookie(request)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(await hashToken(token))
      .run()
  }
  return serializeCookie(request, '', 0)
}

export async function getSessionUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = readCookie(request)
  if (!token) return null
  return env.DB.prepare(
    `SELECT users.* FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<UserRow>()
}

export async function requireUser(request: Request, env: Env): Promise<UserRow> {
  const user = await getSessionUser(request, env)
  if (!user) throw new HttpError(401, 'authRequired')
  return user
}

export function toAccount(user: UserRow) {
  return {
    email: user.email,
    keys: {
      kdfSalt: user.kdf_salt,
      wrappedDek: user.wrapped_dek,
      wrappedDekIv: user.wrapped_dek_iv,
    },
  }
}
