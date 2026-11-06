import {
  analyzeResponseSchema,
  MAX_PERIOD_TOTAL_CHARS,
  PERIODS,
  type AnalyzeResponse,
  type EntryReview,
  type FrameworkChoice,
  type PeriodId,
} from '../../shared/analysis'
import type { CategoryId } from '../../shared/categories'
import mockReview from '../mocks/analysis.json'
import type { JournalEntry } from '../types/journal'
import { apiRequest } from './http'

/** Simulated latency for the demo mock, in milliseconds. */
const MOCK_LATENCY_MS = 1000

export interface AnalyzeOptions {
  /** Lets the caller cancel a pending request (e.g. user navigated back). */
  signal?: AbortSignal
  /** Demo mode (no account): canned review of the sample entry, no network. */
  demo?: boolean
}

/** Careful review of a single entry. */
export async function analyzeEntry(text: string, options: AnalyzeOptions = {}): Promise<AnalyzeResponse> {
  if (text.trim().length === 0) throw new Error('Запись пустая, разбирать пока нечего.')

  if (options.demo) {
    await delay(MOCK_LATENCY_MS, options.signal)
    const review = mockReview as EntryReview
    return {
      kind: 'review',
      review,
      meta: { model: 'demo (мок)', safetyLevel: 0, ungroundedDropped: 0, entriesUsed: 1 },
    }
  }

  return apiRequest('/api/analyze', {
    method: 'POST',
    body: { scope: 'entry', text },
    schema: analyzeResponseSchema,
    signal: options.signal,
  })
}

/** Entries inside a preset period (by calendar date, relative to today). */
export function entriesInPeriod(entries: JournalEntry[], period: PeriodId, today = new Date()): JournalEntry[] {
  const { days } = PERIODS[period]
  if (days === null) return entries
  const from = new Date(today)
  from.setDate(from.getDate() - days)
  const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
  return entries.filter((entry) => entry.date >= fromIso)
}

/**
 * Fits a period into the request budget: if the total is too large, every
 * entry is trimmed to the same maximum length (beginnings are kept), so long
 * entries cannot crowd out the rest of the period.
 */
export function prepareForPeriod(entries: JournalEntry[]): { date: string; text: string }[] {
  const texts = entries.map((entry) => ({
    date: entry.date,
    text: (entry.title ? `${entry.title}\n${entry.text}` : entry.text).trim(),
  }))
  const total = texts.reduce((sum, item) => sum + item.text.length, 0)
  if (total <= MAX_PERIOD_TOTAL_CHARS) return texts

  // Largest per-entry cap that fits the budget.
  const lengths = texts.map((item) => item.text.length).sort((a, b) => a - b)
  let cap = 0
  let used = 0
  for (let i = 0; i < lengths.length; i++) {
    const remaining = lengths.length - i
    const fair = Math.floor((MAX_PERIOD_TOTAL_CHARS - used) / remaining)
    const length = lengths[i] ?? 0
    if (length > fair) {
      cap = fair
      break
    }
    used += length
    cap = length
  }
  return texts.map((item) => ({ ...item, text: item.text.slice(0, cap).trim() })).filter((item) => item.text.length > 0)
}

export interface PeriodRequest {
  period: PeriodId
  framework: FrameworkChoice
  focus?: string
  category?: CategoryId
  entries: JournalEntry[]
}

/** Careful review of a period: dynamics, recurring themes, one pattern. */
export async function analyzePeriod(request: PeriodRequest, signal?: AbortSignal): Promise<AnalyzeResponse> {
  return apiRequest('/api/analyze', {
    method: 'POST',
    body: {
      scope: 'period',
      period: request.period,
      framework: request.framework,
      focus: request.focus?.trim() || undefined,
      category: request.category,
      entries: prepareForPeriod(request.entries),
    },
    schema: analyzeResponseSchema,
    signal,
  })
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}
