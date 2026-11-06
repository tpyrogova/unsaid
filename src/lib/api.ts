import type { Analysis } from '../types/analysis'
import mockAnalysis from '../mocks/analysis.json'

/** Simulated network latency for the mock, in milliseconds. */
const MOCK_LATENCY_MS = 1000

export interface AnalyzeOptions {
  /** Lets the caller cancel a pending analysis (e.g. user navigated back). */
  signal?: AbortSignal
}

/**
 * Analyse a journal entry.
 *
 * Current stage: returns a local mock after a short delay.
 * The text is NOT sent anywhere and NOT persisted.
 *
 * TODO: replace the body with a `fetch` to the Cloudflare Worker, e.g.
 *   const res = await fetch('/api/analyze', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text }),
 *     signal: options.signal,
 *   })
 * and validate the response shape before returning it.
 */
export async function analyzeEntry(
  text: string,
  options: AnalyzeOptions = {},
): Promise<Analysis> {
  if (text.trim().length === 0) {
    throw new Error('Запись пустая, разбирать пока нечего.')
  }

  await delay(MOCK_LATENCY_MS, options.signal)

  const analysis: Analysis = mockAnalysis
  return analysis
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
