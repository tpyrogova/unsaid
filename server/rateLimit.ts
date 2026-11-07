import type { Env } from './env'
import { HttpError } from './http'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 10

/** Throws 429 if this email has too many recent failed logins. */
export async function assertLoginAllowed(env: Env, email: string): Promise<void> {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM login_attempts WHERE email = ? AND attempted_at > ?',
  )
    .bind(email, Date.now() - WINDOW_MS)
    .first<{ count: number }>()

  if ((row?.count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    throw new HttpError(429, 'tooManyAttempts')
  }
}

export async function recordFailedLogin(env: Env, email: string): Promise<void> {
  const now = Date.now()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO login_attempts (email, attempted_at) VALUES (?, ?)').bind(email, now),
    // Opportunistic cleanup keeps the table small without a cron job.
    env.DB.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').bind(now - WINDOW_MS),
  ])
}

export async function clearFailedLogins(env: Env, email: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(email).run()
}
