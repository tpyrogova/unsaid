import type { Env } from '../../server/env'
import { HttpError, json } from '../../server/http'

/**
 * Runs for every /api/* request: turns errors into JSON responses and
 * makes sure nothing (including request bodies) is logged.
 */
export const onRequest: PagesFunction<Env> = async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status })
    }
    // Log only the error type, never request content: it may be a journal.
    console.error('Unhandled API error:', error instanceof Error ? error.name : typeof error)
    return json({ error: 'Что-то пошло не так на сервере' }, { status: 500 })
  }
}
