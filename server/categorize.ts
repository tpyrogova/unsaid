/**
 * Bulk categorization of journal entries with Qwen.
 *
 * Token-efficient by design: entries are numbered (1..N) instead of carrying
 * 32-char ids, the model answers with compact `{ n, category, junk_reason }`
 * items, and the category is constrained to a fixed enum via JSON Schema.
 */
import { z } from 'zod'
import { CATEGORIES, categoryIdSchema, type CategorizedEntry } from '../shared/categories'
import type { AiBinding } from './env'
import { runStructured } from './qwen'

const modelOutputSchema = z.object({
  items: z.array(
    z.object({
      n: z.number().int().min(1).describe('Номер записи из запроса'),
      category: categoryIdSchema.describe('Основная тема записи'),
      junk_reason: z
        .string()
        .nullable()
        .describe('Короткая причина, если запись похожа на мусор; иначе null'),
    }),
  ),
})
type ModelOutput = z.infer<typeof modelOutputSchema>

const CATEGORY_LIST = Object.entries(CATEGORIES)
  .map(([id, label]) => `- ${id}: ${label}`)
  .join('\n')

const SYSTEM_PROMPT = `Ты помогаешь человеку навести порядок в личном дневнике.

Для КАЖДОЙ записи из запроса верни один элемент items с её номером n:
1. category — одна основная тема из списка:
${CATEGORY_LIST}
   Если тем несколько, выбери ту, о которой запись в первую очередь. Запись о собственных переживаниях без явного другого человека или сферы — self.
2. junk_reason — заполняй, только если запись почти наверняка не имеет ценности для дневника: тестовая или случайная запись, бессмысленный набор символов, чистый список покупок или дел без мыслей и чувств, только ссылка. Коротко объясни причину по-русски (до 8 слов). Во всех остальных случаях — null.
   Короткая эмоциональная запись — НЕ мусор. Сомневаешься — null.

Не пропускай записи и не добавляй лишние. Отвечай строго JSON по схеме.`

interface EntryInput {
  id: string
  text: string
}

/** Maps model items back to entry ids, ignoring unknown or duplicate numbers. */
export function mapModelItems(items: ModelOutput['items'], entries: EntryInput[]): CategorizedEntry[] {
  const seen = new Set<number>()
  const results: CategorizedEntry[] = []
  for (const item of items) {
    const entry = entries[item.n - 1]
    if (!entry || seen.has(item.n)) continue
    seen.add(item.n)
    const reason = item.junk_reason?.trim()
    results.push({ id: entry.id, category: item.category, junkReason: reason ? reason : null })
  }
  return results
}

export async function categorizeEntries(ai: AiBinding, entries: EntryInput[]): Promise<CategorizedEntry[]> {
  const user = entries.map((entry, i) => `### ${i + 1}\n${entry.text}`).join('\n\n')

  const output = await runStructured(ai, {
    system: SYSTEM_PROMPT,
    user,
    schema: modelOutputSchema,
    // ~25 output tokens per item, with generous headroom.
    maxTokens: 400 + entries.length * 60,
    temperature: 0.2,
    thinking: false,
    // Retry if the model skipped more than a few entries.
    accept: (value) => mapModelItems(value.items, entries).length >= Math.ceil(entries.length * 0.8),
  })
  return mapModelItems(output.items, entries)
}
