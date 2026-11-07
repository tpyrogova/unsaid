/**
 * Journal categorization contract. Categories are a fixed list so the UI can
 * filter by them and the model cannot invent new ones (enforced via JSON Schema).
 */
import { z } from 'zod'
import { entryIdSchema } from './contract'

export const CATEGORIES = {
  relationships: 'Отношения',
  family: 'Семья',
  friends: 'Друзья и общение',
  work: 'Работа и деньги',
  health: 'Здоровье и тело',
  self: 'Я и мои чувства',
  daily: 'Быт и события',
} as const

export type CategoryId = keyof typeof CATEGORIES

export const categoryIdSchema = z.enum(Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]])

/** Entries per request: keeps one model call well under ~100 s proxy timeouts. */
export const MAX_ENTRIES_PER_CATEGORIZE = 30
/** The beginning of an entry is enough to tell its topic; saves input tokens. */
export const MAX_CATEGORIZE_TEXT_LENGTH = 1500

export const categorizeRequestSchema = z.object({
  /** UI language: junk reasons are written in it. */
  lang: z.enum(['ru', 'en']).default('ru'),
  entries: z
    .array(z.object({ id: entryIdSchema, text: z.string().trim().min(1).max(MAX_CATEGORIZE_TEXT_LENGTH) }))
    .min(1)
    .max(MAX_ENTRIES_PER_CATEGORIZE),
})

export const categorizedEntrySchema = z.object({
  id: entryIdSchema,
  category: categoryIdSchema,
  /** Why the entry looks like junk; `null` if it is a normal entry. */
  junkReason: z.string().nullable(),
})
export type CategorizedEntry = z.infer<typeof categorizedEntrySchema>

export const categorizeResponseSchema = z.object({
  results: z.array(categorizedEntrySchema),
  meta: z.object({ model: z.string() }),
})
