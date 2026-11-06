import { describe, expect, it } from 'vitest'
import { onRequestDelete as deleteAccount } from '../functions/api/account'
import { onRequestGet as me } from '../functions/api/auth/me'
import { onRequestPost as signup } from '../functions/api/auth/signup'
import { onRequestGet as listEntries, onRequestPost as uploadEntries, onRequestDelete as deleteEntries } from '../functions/api/entries/index'
import { onRequestDelete as clearJournal } from '../functions/api/journal'
import { ALICE, b64, call, createEnv } from './helpers'

const entry = (id: string) => ({ id, ciphertext: b64(id, 64), iv: b64('v', 12) })

async function setup() {
  const env = createEnv()
  const alice = (await call(env, signup, { body: ALICE })).cookie
  const bob = (await call(env, signup, { body: { ...ALICE, email: 'bob@example.com' } })).cookie
  await call(env, uploadEntries, { body: { entries: [entry('entry-id-0000001'), entry('entry-id-0000002')] }, cookie: alice })
  await call(env, uploadEntries, { body: { entries: [entry('entry-id-0000009')] }, cookie: bob })
  return { env, alice, bob }
}

const count = async (env: ReturnType<typeof createEnv>, table: string) =>
  (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())?.n

describe('DELETE /api/journal (очистить дневник)', () => {
  it('requires a session and the password', async () => {
    const { env, alice } = await setup()
    expect((await call(env, clearJournal, { method: 'DELETE', body: { authKey: ALICE.authKey } })).status).toBe(401)
    expect((await call(env, clearJournal, { method: 'DELETE', body: { authKey: b64('x') }, cookie: alice })).status).toBe(403)
    expect((await call(env, listEntries, { cookie: alice })).body.entries).toHaveLength(2)
  })

  it('removes all entries and tombstones, keeps the account and other users intact', async () => {
    const { env, alice, bob } = await setup()
    await call(env, deleteEntries, { method: 'DELETE', body: { ids: ['entry-id-0000002'] }, cookie: alice })

    const response = await call(env, clearJournal, { method: 'DELETE', body: { authKey: ALICE.authKey }, cookie: alice })
    expect(response.body).toEqual({ deleted: 1 })
    expect((await call(env, listEntries, { cookie: alice })).body.entries).toEqual([])
    expect(await count(env, 'deleted_entries')).toBe(0)
    expect((await call(env, me, { cookie: alice })).status).toBe(200)
    expect((await call(env, listEntries, { cookie: bob })).body.entries).toHaveLength(1)

    // A fresh import after clearing restores everything, including once-deleted ids.
    const reimport = await call(env, uploadEntries, { body: { entries: [entry('entry-id-0000002')] }, cookie: alice })
    expect(reimport.body).toEqual({ inserted: 1 })
  })
})

describe('DELETE /api/account (удалить персональные данные)', () => {
  it('refuses a wrong password and rate-limits guessing', async () => {
    const { env, alice } = await setup()
    for (let i = 0; i < 10; i++) {
      await call(env, deleteAccount, { method: 'DELETE', body: { authKey: b64('x') }, cookie: alice })
    }
    const blocked = await call(env, deleteAccount, { method: 'DELETE', body: { authKey: ALICE.authKey }, cookie: alice })
    expect(blocked.status).toBe(429)
    expect((await call(env, me, { cookie: alice })).status).toBe(200)
  })

  it("erases every row of the user and nothing of anyone else's", async () => {
    const { env, alice, bob } = await setup()
    await env.DB.prepare("INSERT INTO usage_log (user_id, kind, units, created_at) SELECT id, 'analyze', 1, 0 FROM users").run()
    await env.DB.prepare('INSERT INTO safety_events (user_id, level, scope, created_at) SELECT id, 1, ?, 0 FROM users').bind('entry').run()

    const response = await call(env, deleteAccount, { method: 'DELETE', body: { authKey: ALICE.authKey }, cookie: alice })
    expect(response.status).toBe(200)
    expect(response.setCookie).toMatch(/Max-Age=0/)
    expect((await call(env, me, { cookie: alice })).status).toBe(401)

    const aliceRows = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM users WHERE email = 'alice@example.com')
            + (SELECT COUNT(*) FROM entries WHERE user_id NOT IN (SELECT id FROM users))
            + (SELECT COUNT(*) FROM usage_log WHERE user_id NOT IN (SELECT id FROM users))
            + (SELECT COUNT(*) FROM safety_events WHERE user_id NOT IN (SELECT id FROM users))
            + (SELECT COUNT(*) FROM sessions WHERE user_id NOT IN (SELECT id FROM users)) AS n`,
    ).first<{ n: number }>()
    expect(aliceRows?.n).toBe(0)

    expect((await call(env, listEntries, { cookie: bob })).body.entries).toHaveLength(1)
    expect(await count(env, 'usage_log')).toBe(1)
  })
})
