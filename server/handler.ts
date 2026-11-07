/**
 * API handler shape and the shared error boundary. Routing lives in
 * server/worker.ts (Hono); handlers stay framework-agnostic and are tested
 * directly.
 */
import type { Env } from './env'
import { HttpError, json } from './http'
import { message, requestLang } from './messages'

export interface HandlerContext {
  request: Request
  env: Env
  /** Path parameters, e.g. `{ id }` for /api/entries/:id. */
  params: Record<string, string>
}

export type ApiHandler = (context: HandlerContext) => Response | Promise<Response>

/**
 * Turns errors into localized JSON responses and makes sure nothing
 * (including request bodies) is logged.
 */
export async function runHandler(handler: ApiHandler, context: HandlerContext): Promise<Response> {
  try {
    return await handler(context)
  } catch (error) {
    const lang = requestLang(context.request)
    if (error instanceof HttpError) {
      return json({ error: message(error.key, lang) }, { status: error.status })
    }
    // Log only the error type, never request content: it may be a journal.
    console.error('Unhandled API error:', error instanceof Error ? error.name : typeof error)
    return json({ error: message('internal', lang) }, { status: 500 })
  }
}
