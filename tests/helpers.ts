import type { AiBinding, Env } from '../server/env'
import { runHandler, type ApiHandler } from '../server/handler'
import { createTestDb } from './d1'

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

/** Stand-in for the static-assets binding: serves a fake index.html. */
export const fakeAssets = {
  fetch: async () => new Response('<!doctype html><title>Unsaid</title>', { headers: { 'Content-Type': 'text/html' } }),
} as unknown as Fetcher

export function createEnv(ai: AiBinding = fakeAi()): Env {
  return { ASSETS: fakeAssets, DB: createTestDb(), AI: ai, SALT_SECRET: 'test-secret' }
}

export interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string | null
  params?: Record<string, string>
  contentType?: string
  /** Sent as Accept-Language. */
  lang?: string
}

/** Runs a handler through the same error boundary the router uses. */
export async function call(env: Env, handler: ApiHandler, options: CallOptions = {}) {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('Content-Type', options.contentType ?? 'application/json')
  if (options.cookie) headers.set('Cookie', options.cookie)
  if (options.lang) headers.set('Accept-Language', options.lang)
  const request = new Request('https://unsaid.test/api', {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const response = await runHandler(handler, { request, env, params: options.params ?? {} })

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
