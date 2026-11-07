import { beforeEach, describe, expect, it } from 'vitest'
import { onRequestPost as login } from '../server/api/auth/login'
import { onRequestPost as logout } from '../server/api/auth/logout'
import { onRequestGet as me } from '../server/api/auth/me'
import { onRequestPost as prelogin } from '../server/api/auth/prelogin'
import { onRequestPost as signup } from '../server/api/auth/signup'
import { onRequestDelete as deleteEntry } from '../server/api/entries/[id]'
import {
  onRequestDelete as deleteEntries,
  onRequestGet as listEntries,
  onRequestPost as uploadEntries,
  onRequestPut as updateEntries,
} from '../server/api/entries/index'
import type { Env } from '../server/env'
import type { ApiHandler } from '../server/handler'
import { ALICE, b64, call as callWith, createEnv, type CallOptions } from './helpers'

let env: Env

beforeEach(() => {
  env = createEnv()
})

const call = (handler: ApiHandler, options?: CallOptions) => callWith(env, handler, options)

async function signUpAlice() {
  const response = await call(signup, { body: ALICE })
  expect(response.status).toBe(201)
  return response.cookie
}

describe('auth', () => {
  it('signs up, sets a hardened session cookie and normalizes the email', async () => {
    const response = await call(signup, { body: ALICE })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ email: 'alice@example.com', keys: ALICE.keys })
    expect(response.setCookie).toMatch(/HttpOnly/)
    expect(response.setCookie).toMatch(/SameSite=Strict/)
    expect(response.setCookie).toMatch(/Secure/)
  })

  it('rejects a duplicate email', async () => {
    await signUpAlice()
    const response = await call(signup, { body: { ...ALICE, email: 'alice@example.com' } })
    expect(response.status).toBe(409)
  })

  it('returns the real salt for known emails and a stable decoy for unknown ones', async () => {
    await signUpAlice()

    const known = await call(prelogin, { body: { email: 'alice@example.com' } })
    expect(known.body.kdfSalt).toBe(ALICE.keys.kdfSalt)

    const unknown1 = await call(prelogin, { body: { email: 'nobody@example.com' } })
    const unknown2 = await call(prelogin, { body: { email: 'nobody@example.com' } })
    const other = await call(prelogin, { body: { email: 'someone@example.com' } })
    expect(unknown1.status).toBe(200)
    expect(unknown1.body.kdfSalt).toBe(unknown2.body.kdfSalt)
    expect(unknown1.body.kdfSalt).not.toBe(other.body.kdfSalt)
  })

  it('logs in only with the right authKey, with one message for all failures', async () => {
    await signUpAlice()

    const wrong = await call(login, { body: { email: ALICE.email, authKey: b64('x') } })
    const noUser = await call(login, { body: { email: 'nobody@example.com', authKey: b64('x') } })
    expect(wrong.status).toBe(401)
    expect(noUser.status).toBe(401)
    expect(wrong.body.error).toBe(noUser.body.error)

    const ok = await call(login, { body: { email: ALICE.email, authKey: ALICE.authKey } })
    expect(ok.status).toBe(200)
    expect(ok.body.keys).toEqual(ALICE.keys)
    expect(ok.cookie).toBeTruthy()
  })

  it('rate-limits repeated failed logins, even if the password is then correct', async () => {
    await signUpAlice()
    for (let i = 0; i < 10; i++) {
      await call(login, { body: { email: ALICE.email, authKey: b64('x') } })
    }
    const blocked = await call(login, { body: { email: ALICE.email, authKey: ALICE.authKey } })
    expect(blocked.status).toBe(429)
  })

  it('resolves /me from the session and forgets it after logout', async () => {
    const cookie = await signUpAlice()

    expect((await call(me)).status).toBe(401)
    expect((await call(me, { cookie })).body.email).toBe('alice@example.com')

    const out = await call(logout, { body: {}, cookie })
    expect(out.setCookie).toMatch(/Max-Age=0/)
    expect((await call(me, { cookie })).status).toBe(401)
  })

  it('answers errors in the language from Accept-Language (Russian by default)', async () => {
    await signUpAlice()
    const wrong = { email: ALICE.email, authKey: b64('x') }
    expect((await call(login, { body: wrong, lang: 'en' })).body.error).toBe('Wrong email or password')
    expect((await call(login, { body: wrong, lang: 'ru-RU,ru;q=0.9' })).body.error).toBe('Неверный email или пароль')
    expect((await call(login, { body: wrong })).body.error).toBe('Неверный email или пароль')
    expect((await call(login, { body: wrong, lang: '*' })).body.error).toBe('Неверный email или пароль')
    expect((await call(login, { body: wrong, lang: 'en-GB,en;q=0.9' })).body.error).toBe('Wrong email or password')
  })

  it('rejects non-JSON bodies (blocks cross-site form posts)', async () => {
    const response = await call(login, { body: { email: ALICE.email, authKey: ALICE.authKey }, contentType: 'text/plain' })
    expect(response.status).toBe(415)
  })

  it('rejects malformed input with 400', async () => {
    const response = await call(signup, { body: { ...ALICE, email: 'not-an-email' } })
    expect(response.status).toBe(400)
  })
})

describe('entries', () => {
  const entry = (id: string) => ({ id, ciphertext: b64(id, 64), iv: b64('v', 12) })

  it('requires a session', async () => {
    expect((await call(listEntries)).status).toBe(401)
    expect((await call(uploadEntries, { body: { entries: [entry('entry-id-0000001')] } })).status).toBe(401)
  })

  it('stores ciphertext as-is, and re-uploading the same ids is idempotent', async () => {
    const cookie = await signUpAlice()
    const batch = [entry('entry-id-0000001'), entry('entry-id-0000002')]

    expect((await call(uploadEntries, { body: { entries: batch }, cookie })).body).toEqual({ inserted: 2 })
    expect((await call(uploadEntries, { body: { entries: batch }, cookie })).body).toEqual({ inserted: 0 })

    const list = await call(listEntries, { cookie })
    const stored = list.body.entries as Array<Record<string, unknown>>
    expect(stored).toHaveLength(2)
    expect(stored.map(({ id, ciphertext, iv }) => ({ id, ciphertext, iv }))).toEqual(
      expect.arrayContaining(batch),
    )
  })

  it("isolates users: nobody sees or deletes another user's entries", async () => {
    const alice = await signUpAlice()
    await call(uploadEntries, { body: { entries: [entry('entry-id-0000001')] }, cookie: alice })

    const bob = (await call(signup, { body: { ...ALICE, email: 'bob@example.com' } })).cookie
    expect((await call(listEntries, { cookie: bob })).body.entries).toEqual([])

    await call(deleteEntry, { method: 'DELETE', cookie: bob, params: { id: 'entry-id-0000001' } })
    expect((await call(listEntries, { cookie: alice })).body.entries).toHaveLength(1)

    await call(deleteEntry, { method: 'DELETE', cookie: alice, params: { id: 'entry-id-0000001' } })
    expect((await call(listEntries, { cookie: alice })).body.entries).toEqual([])
  })

  it('re-import never overwrites an existing entry, only adds new ones', async () => {
    const cookie = await signUpAlice()
    const original = entry('entry-id-0000001')
    await call(uploadEntries, { body: { entries: [original] }, cookie })

    const reexport = [{ ...original, ciphertext: b64('n', 64) }, entry('entry-id-0000002')]
    expect((await call(uploadEntries, { body: { entries: reexport }, cookie })).body).toEqual({ inserted: 1 })

    const stored = (await call(listEntries, { cookie })).body.entries as Array<{ id: string; ciphertext: string }>
    expect(stored.find((e) => e.id === original.id)?.ciphertext).toBe(original.ciphertext)
    expect(stored).toHaveLength(2)
  })

  it('updates ciphertext of existing entries only', async () => {
    const cookie = await signUpAlice()
    await call(uploadEntries, { body: { entries: [entry('entry-id-0000001')] }, cookie })

    const changed = { ...entry('entry-id-0000001'), ciphertext: b64('z', 64) }
    const missing = entry('entry-id-0000009')
    const response = await call(updateEntries, { method: 'PUT', body: { entries: [changed, missing] }, cookie })
    expect(response.body).toEqual({ updated: 1 })

    const stored = (await call(listEntries, { cookie })).body.entries as Array<{ ciphertext: string }>
    expect(stored.map((e) => e.ciphertext)).toEqual([changed.ciphertext])
  })

  it('bulk-deletes, and deleted entries do not come back on re-import', async () => {
    const cookie = await signUpAlice()
    const batch = [entry('entry-id-0000001'), entry('entry-id-0000002')]
    await call(uploadEntries, { body: { entries: batch }, cookie })

    const del = await call(deleteEntries, { method: 'DELETE', body: { ids: ['entry-id-0000001'] }, cookie })
    expect(del.body).toEqual({ deleted: 1 })

    expect((await call(uploadEntries, { body: { entries: batch }, cookie })).body).toEqual({ inserted: 0 })
    const stored = (await call(listEntries, { cookie })).body.entries as Array<{ id: string }>
    expect(stored.map((e) => e.id)).toEqual(['entry-id-0000002'])
  })
})
