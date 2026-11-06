import type { z } from 'zod'

/** An error that is safe to show to the client as-is. */
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Hard cap on request bodies (bytes). Upload batches are the largest payload. */
const MAX_BODY_BYTES = 30 * 1024 * 1024

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(data), { ...init, headers })
}

/**
 * Parse and validate a JSON body.
 * Requiring `application/json` also blocks simple cross-site form posts (CSRF).
 */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const contentType = request.headers.get('Content-Type') ?? ''
  if (!contentType.startsWith('application/json')) {
    throw new HttpError(415, 'Ожидается JSON')
  }
  const length = Number(request.headers.get('Content-Length') ?? 0)
  if (length > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Слишком большой запрос')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError(400, 'Некорректный JSON')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new HttpError(400, 'Некорректные данные запроса')
  }
  return parsed.data
}
