/**
 * Safety protocol, step 1: a separate risk check before any review.
 * Kept apart from the main prompt so it can be tested and measured on its own.
 */
import { z } from 'zod'
import type { SafetyLevel } from '../shared/analysis'
import { safetySystemPrompt } from './carefulPrompt'
import type { AiBinding } from './env'
import { runStructured } from './qwen'

const outputSchema = z.object({
  level: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  reason: z.string(),
})

/** Crisis mode is about safety *now*: only recent entries can trigger level 2. */
export const CRISIS_WINDOW_DAYS = 14

interface DatedText {
  date?: string
  text: string
}

export async function assessRisk(ai: AiBinding, items: DatedText[], today: Date = new Date()): Promise<SafetyLevel> {
  const isPeriod = items.length > 1 || items[0]?.date !== undefined
  const user = isPeriod
    ? `Сегодня ${today.toISOString().slice(0, 10)}. Уровень 2 ставь, только если признаки кризиса есть в записях за последние ${CRISIS_WINDOW_DAYS} дней; такие же признаки только в более старых записях — уровень 1.\n\n` +
      items.map((item) => `### ${item.date ?? ''}\n${item.text}`).join('\n\n')
    : `Запись:\n\n${items[0]?.text ?? ''}`

  const result = await runStructured(ai, {
    system: safetySystemPrompt(),
    user,
    schema: outputSchema,
    maxTokens: 200,
    // Deterministic and cheap: a classification, not a conversation.
    temperature: 0,
    thinking: false,
  })
  return result.level
}
