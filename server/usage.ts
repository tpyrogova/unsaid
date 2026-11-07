/**
 * Per-user daily budgets for model calls. The free Workers AI quota is shared
 * by the whole app, so no single user may exhaust it.
 */
import type { Env } from './env'
import { HttpError } from './http'
import type { MessageKey } from './messages'

const DAY_MS = 24 * 60 * 60 * 1000

export type UsageKind = 'analyze' | 'period' | 'categorize'

interface Budget {
  /** Units allowed per rolling 24 hours. */
  limit: number
  /** Shown when the budget is exhausted. */
  message: MessageKey
}

export const BUDGETS: Record<UsageKind, Budget> = {
  analyze: { limit: 20, message: 'budgetAnalyze' },
  period: { limit: 5, message: 'budgetPeriod' },
  categorize: { limit: 400, message: 'budgetCategorize' },
}

/** Throws 429 if adding `units` would exceed today's budget. */
export async function assertWithinBudget(env: Env, userId: string, kind: UsageKind, units: number): Promise<void> {
  const row = await env.DB.prepare(
    'SELECT COALESCE(SUM(units), 0) AS used FROM usage_log WHERE user_id = ? AND kind = ? AND created_at > ?',
  )
    .bind(userId, kind, Date.now() - DAY_MS)
    .first<{ used: number }>()

  const budget = BUDGETS[kind]
  if ((row?.used ?? 0) + units > budget.limit) throw new HttpError(429, budget.message)
}

/** Recorded only after a successful call, so failed model calls cost nothing. */
export async function recordUsage(env: Env, userId: string, kind: UsageKind, units: number): Promise<void> {
  await env.DB.prepare('INSERT INTO usage_log (user_id, kind, units, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, kind, units, Date.now())
    .run()
}
