import { describe, expect, it } from 'vitest'
import { onRequestPost as signup } from '../functions/api/auth/signup'
import { onRequestPost as categorize } from '../functions/api/categorize'
import { mapModelItems } from '../server/categorize'
import { ALICE, call, createEnv, fakeAi } from './helpers'

const entries = [
  { id: 'entry-id-0000001', text: 'Поссорилась с мужем из-за отпуска.' },
  { id: 'entry-id-0000002', text: 'тест' },
  { id: 'entry-id-0000003', text: 'Начальник снова перенёс дедлайн.' },
]

const items = [
  { n: 1, category: 'relationships', junk_reason: null },
  { n: 2, category: 'daily', junk_reason: 'Тестовая запись' },
  { n: 3, category: 'work', junk_reason: '  ' },
]

async function signedIn(ai = fakeAi()) {
  const env = createEnv(ai)
  const { cookie } = await call(env, signup, { body: ALICE })
  return { env, cookie, ai }
}

describe('mapModelItems', () => {
  it('maps numbers back to ids, ignoring unknown and duplicate numbers', () => {
    const mapped = mapModelItems(
      [...items, { n: 9, category: 'self', junk_reason: null }, { n: 1, category: 'work', junk_reason: null }] as never,
      entries,
    )
    expect(mapped).toEqual([
      { id: 'entry-id-0000001', category: 'relationships', junkReason: null },
      { id: 'entry-id-0000002', category: 'daily', junkReason: 'Тестовая запись' },
      // Blank reasons are normalized to null.
      { id: 'entry-id-0000003', category: 'work', junkReason: null },
    ])
  })
})

describe('POST /api/categorize', () => {
  it('requires a session', async () => {
    expect((await call(createEnv(), categorize, { body: { entries } })).status).toBe(401)
  })

  it('categorizes a batch, sending numbered entries instead of ids', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi({ response: { items } }))
    const response = await call(env, categorize, { body: { entries }, cookie })

    expect(response.status).toBe(200)
    expect(response.body.results).toHaveLength(3)
    const prompt = JSON.stringify(ai.calls[0]?.messages)
    expect(prompt).toContain('### 2')
    expect(prompt).not.toContain('entry-id-0000002')
  })

  it('rejects categories outside the fixed list', async () => {
    const invented = [{ n: 1, category: 'hobbies', junk_reason: null }]
    const { env, cookie } = await signedIn(fakeAi({ response: { items: invented } }, { response: { items: invented } }))
    expect((await call(env, categorize, { body: { entries: entries.slice(0, 1) }, cookie })).status).toBe(502)
  })

  it('retries when the model skips too many entries', async () => {
    const { env, cookie, ai } = await signedIn(
      fakeAi({ response: { items: items.slice(0, 1) } }, { response: { items } }),
    )
    const response = await call(env, categorize, { body: { entries }, cookie })
    expect(response.status).toBe(200)
    expect(ai.calls).toHaveLength(2)
  })

  it('enforces the daily budget in entries, not requests', async () => {
    const { env, cookie } = await signedIn()
    await env.DB.prepare("INSERT INTO usage_log (user_id, kind, units, created_at) SELECT id, 'categorize', 399, ? FROM users")
      .bind(Date.now())
      .run()
    expect((await call(env, categorize, { body: { entries }, cookie })).status).toBe(429)
  })

  it('does not charge the budget when the model fails', async () => {
    const { env, cookie } = await signedIn(fakeAi(new Error('down'), new Error('down')))
    expect((await call(env, categorize, { body: { entries }, cookie })).status).toBe(502)
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage_log').first<{ n: number }>()
    expect(row?.n).toBe(0)
  })
})
