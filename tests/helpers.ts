import { onRequest as middleware } from '../functions/api/_middleware'
import type { AiBinding, Env } from '../server/env'
import { createTestDb } from './d1'

type Context = EventContext<Env, string, Record<string, unknown>>

/** Fake Workers AI: returns queued responses in order. */
export function fakeAi(...responses: unknown[]): AiBinding & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = []
  return {
    calls,
    run: async (_model, inputs) => {
      calls.push(inputs)
      const next = responses.shift()
      if (next instanceof Error) throw next
      return next
    },
  }
}

export function createEnv(ai: AiBinding = fakeAi()): Env {
  return { DB: createTestDb(), AI: ai, SALT_SECRET: 'test-secret' }
}

export interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string | null
  params?: Record<string, string>
  contentType?: string
}

/** Runs a handler through the real middleware, like Pages does. */
export async function call(env: Env, handler: PagesFunction<Env>, options: CallOptions = {}) {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('Content-Type', options.contentType ?? 'application/json')
  if (options.cookie) headers.set('Cookie', options.cookie)
  const request = new Request('https://unsaid.test/api', {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const context = { request, env, params: options.params ?? {} }
  const next = () => handler(context as unknown as Context)
  const response = await middleware({ ...context, next } as unknown as Context)

  const setCookie = response.headers.get('Set-Cookie')
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    setCookie,
    /** `name=value` part, ready to send back as a Cookie header. */
    cookie: setCookie?.split(';')[0] ?? null,
  }
}

export const b64 = (seed: string, bytes = 32) => btoa(seed.repeat(bytes).slice(0, bytes))

export const ALICE = {
  email: 'Alice@Example.com',
  authKey: b64('a'),
  keys: { kdfSalt: b64('s', 16), wrappedDek: b64('w', 48), wrappedDekIv: b64('i', 12) },
}
