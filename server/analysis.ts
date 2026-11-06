/**
 * Careful review of one entry or a period, per prompts/careful-review.md.
 *
 * Pipeline: risk check (separate call) → review in the five fixed blocks
 * (JSON Schema) → grounding (every quote must occur in the text).
 * Texts are never logged or stored.
 */
import { entryReviewSchema, periodReviewSchema, type FrameworkChoice, type Review } from '../shared/analysis'
import { buildReviewSystemPrompt } from './carefulPrompt'
import type { AiBinding } from './env'
import { runStructured } from './qwen'

export { QWEN_MODEL as ANALYSIS_MODEL } from './qwen'

/** Lenient comparison: case, ё/е, quote styles, dashes and whitespace don't matter. */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»„“”"'’ʼ`]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[\s ]+/g, ' ')
    .replace(/^[\s.,;:!?…-]+|[\s.,;:!?…-]+$/g, '')
    .trim()
}

/**
 * Removes feelings and thinking traps whose quote cannot be found in the
 * source text: the main guard against attributing words the author never
 * wrote ("нет цитаты — нет наблюдения").
 */
export function groundReview<T extends Review>(review: T, source: string): { review: T; dropped: number } {
  const haystack = normalizeForMatch(source)
  const grounded = (quote: string) => {
    const needle = normalizeForMatch(quote)
    return needle.length > 0 && haystack.includes(needle)
  }
  const feelings = review.feelings.filter((item) => grounded(item.quote))
  const distortions = review.distortions.filter((item) => grounded(item.quote))
  const dropped = review.feelings.length - feelings.length + (review.distortions.length - distortions.length)
  return { review: { ...review, feelings, distortions }, dropped }
}

export interface ReviewInput {
  scope: 'entry' | 'period'
  /** One item for an entry; dated items for a period. */
  items: { date?: string; text: string }[]
  framework: FrameworkChoice
  focus?: string
  caution: boolean
}

export async function reviewText(ai: AiBinding, input: ReviewInput): Promise<{ review: Review; dropped: number }> {
  const isPeriod = input.scope === 'period'
  const user = isPeriod
    ? `Записи из дневника за период (от старых к новым):\n\n${input.items.map((item) => `### ${item.date}\n${item.text}`).join('\n\n')}`
    : `Запись из дневника:\n\n${input.items[0]?.text ?? ''}`

  const system = buildReviewSystemPrompt({
    framework: input.framework,
    scope: input.scope,
    caution: input.caution,
    focus: input.focus,
  })

  const review: Review = isPeriod
    ? await runStructured(ai, { system, user, schema: periodReviewSchema, maxTokens: 2500, temperature: 0.4, thinking: false })
    : await runStructured(ai, { system, user, schema: entryReviewSchema, maxTokens: 3000, temperature: 0.4, thinking: true })

  return groundReview(review, input.items.map((item) => item.text).join('\n'))
}
