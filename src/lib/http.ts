import type { z } from 'zod'
import { errorResponseSchema } from '../../shared/contract'
import { dict, getLang } from '../i18n'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** Every response is validated: the client never trusts the server's shape. */
  schema: z.ZodType<T>
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        // The server answers errors in the UI language.
        'Accept-Language': getLang(),
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(0, dict().api.offline)
  }

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(data)
    if (parsed.success) throw new ApiError(response.status, parsed.data.error)
    // No JSON body: the API itself is unreachable (e.g. a gateway/proxy error).
    const unreachable = response.status >= 502 && response.status <= 504
    throw new ApiError(
      response.status,
      unreachable ? dict().api.unavailable : dict().api.httpError(response.status),
    )
  }

  const parsed = options.schema.safeParse(data)
  if (!parsed.success) throw new ApiError(response.status, dict().api.unexpected)
  return parsed.data
}
