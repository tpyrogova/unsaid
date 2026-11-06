/**
 * Careful-review contract, following prompts/careful-review.md:
 * five fixed blocks (Услышано → Чувства и потребности → Замеченный паттерн →
 * Вопросы себе → Маленькие шаги), plus «Что меняется» for a period.
 *
 * One zod schema is the source of truth for TypeScript types, the JSON Schema
 * sent to the model, and validation of its answer on server and client.
 */
import { z } from 'zod'
import { categoryIdSchema } from './categories'

/** One framework per review: the instructions forbid mixing them. */
export const FRAMEWORKS = {
  cbt: 'КПТ',
  schema: 'схема-терапия',
  attachment: 'привязанность',
} as const
export type FrameworkId = keyof typeof FRAMEWORKS
export const frameworkIdSchema = z.enum(Object.keys(FRAMEWORKS) as [FrameworkId, ...FrameworkId[]])

/** "auto" = our method: the model picks the framework and explains why. */
export const frameworkChoiceSchema = z.union([z.literal('auto'), frameworkIdSchema])
export type FrameworkChoice = z.infer<typeof frameworkChoiceSchema>

const feelingSchema = z.object({
  quote: z.string().min(1).describe('Короткая дословная цитата из записи (символ в символ), на которую опирается наблюдение'),
  feeling: z.string().min(1).describe('Чувство, например «тревога»'),
  need: z.string().min(1).describe('Потребность за чувством: безопасность, взаимность, определённость, ценность…'),
})

const distortionSchema = z.object({
  type: z.string().min(1).describe('Название ловушки мышления, например «чтение мыслей», «катастрофизация» — про мысль, а не про человека'),
  quote: z.string().min(1).describe('Короткая дословная цитата из записи (символ в символ), где видна эта ловушка'),
  reframe: z.string().min(1).describe('Более бережный взгляд на ту же мысль, от первого лица'),
})

const reviewFields = {
  heard: z.string().min(1).describe('Услышано: 1–2 предложения, главное своими словами, без интерпретации'),
  feelings: z.array(feelingSchema).min(1).max(5).describe('Чувства и потребности: 2–4 пункта'),
  pattern: z.object({
    framework: frameworkIdSchema.describe('Рамка анализа (ровно одна)'),
    rationale: z.string().min(1).describe('Одной строкой: почему выбрана эта рамка'),
    hypothesis: z.string().min(1).describe('Одна гипотеза в этой рамке; закончи вопросом «откликается ли?»'),
  }),
  distortions: z
    .array(distortionSchema)
    .max(3)
    .describe('Ловушки мышления: 0–2, только если явно видны в тексте'),
  question: z.string().min(1).describe('Вопрос себе: ровно один открытый вопрос'),
  steps: z.array(z.string().min(1)).min(1).max(3).describe('Маленькие шаги: 1–3 варианта на выбор'),
}

export const entryReviewSchema = z.object(reviewFields)

export const periodReviewSchema = z.object({
  ...reviewFields,
  changes: z
    .string()
    .min(1)
    .describe('Что меняется за период: что повторяется, а что сдвинулось — рост или хождение по кругу, с опорой на даты'),
})

export type EntryReview = z.infer<typeof entryReviewSchema>
export type PeriodReview = z.infer<typeof periodReviewSchema>
/** `changes` is present for period reviews only. */
export type Review = EntryReview & { changes?: string }

/* ---------- Request ---------- */

export const MAX_ANALYSIS_TEXT_LENGTH = 12_000
/** Budget for a period: ~45k tokens of input, well within the model's context. */
export const MAX_PERIOD_TOTAL_CHARS = 120_000
export const MAX_PERIOD_ENTRIES = 1000
export const MAX_FOCUS_LENGTH = 300

export const PERIODS = {
  week: { label: 'Последние 7 дней', days: 7 },
  month: { label: 'Последние 30 дней', days: 30 },
  quarter: { label: '3 месяца', days: 91 },
  half: { label: 'Полгода', days: 182 },
  year: { label: 'Год', days: 365 },
  all: { label: 'Всё время', days: null },
} as const
export type PeriodId = keyof typeof PERIODS
export const periodIdSchema = z.enum(Object.keys(PERIODS) as [PeriodId, ...PeriodId[]])

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const analyzeRequestSchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('entry'),
    text: z.string().trim().min(1).max(MAX_ANALYSIS_TEXT_LENGTH),
  }),
  z.object({
    scope: z.literal('period'),
    period: periodIdSchema,
    framework: frameworkChoiceSchema,
    focus: z.string().trim().max(MAX_FOCUS_LENGTH).optional(),
    /** Optional topic filter applied on the client; passed for context only. */
    category: categoryIdSchema.optional(),
    entries: z
      .array(z.object({ date: isoDate, text: z.string().trim().min(1) }))
      .min(1)
      .max(MAX_PERIOD_ENTRIES)
      .refine((entries) => entries.reduce((sum, e) => sum + e.text.length, 0) <= MAX_PERIOD_TOTAL_CHARS, {
        message: 'Слишком много текста для одного разбора',
      }),
  }),
])
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>

/* ---------- Response ---------- */

/** Safety levels from the protocol: 0 = no risk, 1 = caution, 2 = crisis. */
export const safetyLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])
export type SafetyLevel = z.infer<typeof safetyLevelSchema>

const crisisContactSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  tel: z.string().optional(),
  url: z.string().optional(),
  note: z.string(),
  source: z.string(),
})

export const analyzeResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('review'),
    review: entryReviewSchema.extend({ changes: z.string().optional() }),
    meta: z.object({
      model: z.string(),
      /** Level 1 = caution mode: shorter review focused on support. */
      safetyLevel: z.union([z.literal(0), z.literal(1)]),
      /** Feelings removed because their quote was not found in the text. */
      ungroundedDropped: z.number().int().nonnegative(),
      entriesUsed: z.number().int().positive(),
    }),
  }),
  z.object({
    /** Level 2: no review; a direct, warm message and help contacts instead. */
    kind: z.literal('crisis'),
    contacts: z.array(z.object({ country: z.string(), contacts: z.array(crisisContactSchema) })),
  }),
])
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>
