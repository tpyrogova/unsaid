import { describe, expect, it } from 'vitest'
import worker from '../server/worker'
import { ALICE, createEnv } from './helpers'

/** Calls the real Worker entry, as Cloudflare would. */
async function request(path: string, init: RequestInit = {}, env = createEnv()) {
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext
  return worker.fetch(new Request(`https://unsaid.test${path}`, init) as Request<unknown, IncomingRequestCfProperties>, env, ctx)
}

const jsonPost = (body: unknown, method = 'POST') => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('Worker routing (Hono)', () => {
  it('routes API calls to handlers', async () => {
    const env = createEnv()
    const signup = await request('/api/auth/signup', jsonPost(ALICE), env)
    expect(signup.status).toBe(201)
    const cookie = signup.headers.get('Set-Cookie')?.split(';')[0] ?? ''

    const me = await request('/api/auth/me', { headers: { Cookie: cookie } }, env)
    expect(me.status).toBe(200)
    expect(((await me.json()) as { email: string }).email).toBe('alice@example.com')
  })

  it('passes path parameters (/api/entries/:id)', async () => {
    const response = await request('/api/entries/not-valid!', { method: 'DELETE' })
    // Reaches the handler: auth is checked first, so no session → 401, not 404.
    expect(response.status).toBe(401)
  })

  it('answers unknown API routes and wrong methods with a localized JSON 404', async () => {
    const unknown = await request('/api/nope', { headers: { 'Accept-Language': 'en' } })
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toEqual({ error: 'Unknown API route' })

    const wrongMethod = await request('/api/auth/login')
    expect(wrongMethod.status).toBe(404)
    expect(await wrongMethod.json()).toEqual({ error: 'Неизвестный адрес API' })
  })

  it('keeps the shared error boundary (localized handler errors)', async () => {
    const response = await request('/api/auth/login', { ...jsonPost({}), headers: { 'Content-Type': 'text/plain' } })
    expect(response.status).toBe(415)
  })

  it('serves everything outside /api from static assets', async () => {
    const response = await request('/journal/some/spa/route')
    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(await response.text()).toContain('<title>Unsaid</title>')
  })
})
