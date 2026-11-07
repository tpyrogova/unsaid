import { describe, expect, it } from 'vitest'
import { onRequestPost as analyze } from '../server/api/analyze'
import { onRequestPost as signup } from '../server/api/auth/signup'
import { ANALYSIS_MODEL, groundReview } from '../server/analysis'
import { extractModelOutput } from '../server/qwen'
import type { PeriodReview, Review } from '../shared/analysis'
import { ALICE, call, createEnv, fakeAi } from './helpers'

const ENTRY =
  'Сегодня Аня снова написала первой, и я одновременно обрадовалась и напряглась. ' +
  'Наверное, она просто терпит меня из вежливости. Хочется перестать гадать.'

const REVIEW: Review = {
  heard: 'Тебе тепло с Аней, и тревожно от неопределённости.',
  feelings: [
    { quote: 'одновременно обрадовалась и напряглась', feeling: 'радость и тревога', need: 'безопасность' },
    { quote: 'Хочется перестать гадать', feeling: 'усталость', need: 'определённость' },
  ],
  distortions: [{ type: 'Чтение мыслей', quote: 'она просто терпит меня', reframe: 'Я не знаю, что она думает.' }],
  pattern: { framework: 'attachment', rationale: 'Тема близости.', hypothesis: 'Похоже, неопределённость пугает. Откликается ли?' },
  question: 'Что ты чувствуешь, когда она не отвечает?',
  steps: ['Можно заметить, что происходит в теле.'],
}
const PERIOD_REVIEW: PeriodReview = { ...REVIEW, changes: 'К осени тон спокойнее.' }

const risk = (level: 0 | 1 | 2) => ({ response: { level, reason: 'тест' } })

/** Message contents of the n-th model call. */
const contents = (call: Record<string, unknown> | undefined) =>
  ((call?.messages ?? []) as Array<{ content: string }>).map((message) => message.content)

async function signedIn(ai = fakeAi()) {
  const env = createEnv(ai)
  const { cookie } = await call(env, signup, { body: ALICE })
  return { env, cookie, ai }
}

const entryBody = { scope: 'entry', text: ENTRY }
const periodBody = {
  scope: 'period',
  period: 'month',
  framework: 'auto',
  entries: [
    { date: '2026-10-20', text: 'Сегодня Аня снова написала первой, и я одновременно обрадовалась и напряглась.' },
    { date: '2026-10-01', text: 'Хочется перестать гадать.' },
  ],
}

describe('extractModelOutput', () => {
  it.each([
    ['an object in `response`', { response: REVIEW }],
    ['a JSON string in `response`', { response: JSON.stringify(REVIEW) }],
    ['a fenced string with a preamble', { response: 'Вот:\n```json\n' + JSON.stringify(REVIEW) + '\n```' }],
    ['OpenAI-style choices', { choices: [{ message: { content: JSON.stringify(REVIEW) } }] }],
  ])('handles %s', (_label, raw) => {
    expect(extractModelOutput(raw)).toEqual(REVIEW)
  })
})

describe('groundReview', () => {
  it('drops feelings and thinking traps whose quote is not in the text («нет цитаты — нет наблюдения»)', () => {
    const invented: Review = {
      ...REVIEW,
      feelings: [...REVIEW.feelings, { quote: 'я злюсь на маму', feeling: 'злость', need: 'x' }],
      distortions: [...REVIEW.distortions, { type: 'Катастрофизация', quote: 'всё пропало навсегда', reframe: 'x' }],
    }
    const { review, dropped } = groundReview(invented, ENTRY)
    expect(dropped).toBe(2)
    expect(review.feelings).toHaveLength(2)
    expect(review.distortions).toHaveLength(1)
  })

  it('ignores case, ё/е, quote marks and surrounding punctuation', () => {
    const fuzzy = { ...REVIEW, distortions: [], feelings: [{ quote: 'ВСЕ плохо, еще хуже...', feeling: 'x', need: 'y' }] }
    expect(groundReview(fuzzy, 'Всё «плохо», ещё хуже.').dropped).toBe(0)
  })
})

describe('POST /api/analyze', () => {
  it('requires a session (the free model quota is shared)', async () => {
    expect((await call(createEnv(), analyze, { body: entryBody })).status).toBe(401)
  })

  it('runs the risk check first, then the review, and returns grounded blocks', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(0), { response: REVIEW }))
    const response = await call(env, analyze, { body: entryBody, cookie })

    expect(response.status).toBe(200)
    expect(response.body.kind).toBe('review')
    expect(response.body.meta).toEqual({ model: ANALYSIS_MODEL, safetyLevel: 0, ungroundedDropped: 0, entriesUsed: 1 })
    expect(ai.calls).toHaveLength(2)
    expect(JSON.stringify(ai.calls[0]?.messages)).toContain('классификатор риска')
    expect(ai.calls[1]?.response_format).toMatchObject({ type: 'json_schema' })
  })

  it('builds the review prompt from prompts/careful-review.md', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(0), { response: REVIEW }))
    await call(env, analyze, { body: entryBody, cookie })
    const [system = ''] = contents(ai.calls[1])

    expect(system).toContain('внимательный собеседник для рефлексии')
    expect(system).toContain('Язык: запреты и замены')
    expect(system).not.toContain('{framework}')
    expect(system).not.toContain('{crisis_contacts}')
    expect(system).toContain('TelefonSeelsorge')
    expect(system).toContain('ровно ОДИН вопрос')
    expect(system).toContain('Ловушки мышления')
  })

  it('level 2: no review is made, help contacts come from config', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(2)))
    const response = await call(env, analyze, { body: entryBody, cookie })

    expect(response.body.kind).toBe('crisis')
    expect(JSON.stringify(response.body.contacts)).toContain('0800 111 0 111')
    expect(ai.calls).toHaveLength(1)
    const logged = await env.DB.prepare('SELECT level FROM safety_events').all<{ level: number }>()
    expect(logged.results).toEqual([{ level: 2 }])
  })

  it('level 1: shorter, support-focused review and the trigger is logged', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(1), { response: REVIEW }))
    const response = await call(env, analyze, { body: entryBody, cookie })

    expect((response.body.meta as { safetyLevel: number }).safetyLevel).toBe(1)
    expect(JSON.stringify(ai.calls[1]?.messages)).toContain('РЕЖИМ НАСТОРОЖЕННОСТИ')
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM safety_events').first<{ n: number }>())?.n).toBe(1)
  })

  it('period: sorts entries by date, adds «Что меняется», passes framework and focus as data', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(0), { response: PERIOD_REVIEW }))
    const response = await call(env, analyze, {
      body: { ...periodBody, framework: 'cbt', focus: 'отношения с мамой' },
      cookie,
    })

    expect(response.status).toBe(200)
    expect((response.body.review as PeriodReview).changes).toBe('К осени тон спокойнее.')
    expect((response.body.meta as { entriesUsed: number }).entriesUsed).toBe(2)
    const [system, user] = contents(ai.calls[1])
    expect(system).toContain('Рамка анализа: КПТ')
    expect(system).toContain('«отношения с мамой»')
    expect(user?.indexOf('2026-10-01')).toBeLessThan(user?.indexOf('2026-10-20') ?? 0)
    // Only recent entries may trigger crisis mode in a period.
    expect(JSON.stringify(ai.calls[0]?.messages)).toContain('последние 14 дней')
  })

  it('retries once when the model output does not match the schema', async () => {
    const { env, cookie, ai } = await signedIn(fakeAi(risk(0), { response: '{"oops": true}' }, { response: REVIEW }))
    expect((await call(env, analyze, { body: entryBody, cookie })).status).toBe(200)
    expect(ai.calls).toHaveLength(3)
  })

  it('answers 502 when the model keeps failing, without leaking text', async () => {
    const { env, cookie } = await signedIn(fakeAi(risk(0), new Error('boom: ' + ENTRY), new Error('again: ' + ENTRY)))
    const response = await call(env, analyze, { body: entryBody, cookie })
    expect(response.status).toBe(502)
    expect(JSON.stringify(response.body)).not.toContain('Аня')
  })

  it('explains an exhausted daily model quota and does not retry', async () => {
    const quota = new Error('AiError: you have used up your daily free allocation of 10,000 neurons (4006)')
    const { env, cookie, ai } = await signedIn(fakeAi(quota, quota))
    const response = await call(env, analyze, { body: entryBody, cookie })

    expect(response.status).toBe(503)
    expect(String(response.body.error)).toContain('дневной лимит')
    expect(ai.calls).toHaveLength(1)
  })

  it('validates input: empty text, unknown period, too much text', async () => {
    const { env, cookie } = await signedIn()
    expect((await call(env, analyze, { body: { scope: 'entry', text: ' ' }, cookie })).status).toBe(400)
    expect((await call(env, analyze, { body: { ...periodBody, period: 'decade' }, cookie })).status).toBe(400)
    const huge = { ...periodBody, entries: Array.from({ length: 200 }, () => ({ date: '2026-01-01', text: 'а'.repeat(700) })) }
    expect((await call(env, analyze, { body: huge, cookie })).status).toBe(400)
  })

  it('has separate daily budgets for entry and period reviews', async () => {
    const { env, cookie } = await signedIn()
    await env.DB.prepare("INSERT INTO usage_log (user_id, kind, units, created_at) SELECT id, 'period', 5, ? FROM users")
      .bind(Date.now())
      .run()
    expect((await call(env, analyze, { body: periodBody, cookie })).status).toBe(429)
  })
})
