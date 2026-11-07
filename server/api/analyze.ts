import { CRISIS_CONTACTS } from '../../config/crisis-contacts'
import { analyzeRequestSchema, type AnalyzeResponse } from '../../shared/analysis'
import { ANALYSIS_MODEL, reviewText } from '../../server/analysis'
import type { ApiHandler } from '../../server/handler'
import { json, readJson } from '../../server/http'
import { assessRisk } from '../../server/safety'
import { requireUser } from '../../server/session'
import { assertWithinBudget, recordUsage } from '../../server/usage'

/**
 * Careful review of one entry or a period (prompts/careful-review.md).
 * Texts exist only for the duration of the request: not stored, not logged,
 * and Workers AI keeps zero data retention.
 */
export const onRequestPost: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const body = await readJson(request, analyzeRequestSchema)
  const kind = body.scope === 'entry' ? 'analyze' : 'period'
  await assertWithinBudget(env, user.id, kind, 1)

  const items =
    body.scope === 'entry'
      ? [{ text: body.text }]
      : [...body.entries].sort((a, b) => a.date.localeCompare(b.date))

  // Safety protocol: a separate risk check comes first.
  const level = await assessRisk(env.AI, items)
  if (level > 0) {
    await env.DB.prepare('INSERT INTO safety_events (user_id, level, scope, created_at) VALUES (?, ?, ?, ?)')
      .bind(user.id, level, body.scope, Date.now())
      .run()
  }
  if (level === 2) {
    await recordUsage(env, user.id, kind, 1)
    return json({ kind: 'crisis', contacts: CRISIS_CONTACTS } satisfies AnalyzeResponse)
  }

  const { review, dropped } = await reviewText(env.AI, {
    scope: body.scope,
    items,
    framework: body.scope === 'period' ? body.framework : 'auto',
    focus: body.scope === 'period' ? body.focus || undefined : undefined,
    caution: level === 1,
  })
  await recordUsage(env, user.id, kind, 1)

  return json({
    kind: 'review',
    review,
    meta: { model: ANALYSIS_MODEL, safetyLevel: level, ungroundedDropped: dropped, entriesUsed: items.length },
  } satisfies AnalyzeResponse)
}
