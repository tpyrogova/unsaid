/**
 * Structured calls to Qwen on Workers AI: JSON Schema output, tolerant
 * parsing, zod validation and one retry. Used by analysis and categorization.
 * Request content is never logged.
 */
import { z } from 'zod'
import type { AiBinding } from './env'
import { HttpError } from './http'

/** Not deprecated, 262k context, supports `response_format`. */
export const QWEN_MODEL = '@cf/qwen/qwen3.8-27b'

const MAX_ATTEMPTS = 2

/** JSON Schema for `response_format`, minus `$schema` metadata some backends reject. */
export function toModelJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _meta, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>
  return jsonSchema
}

/**
 * Workers AI returns either `{ response }` (string or already-parsed object)
 * or an OpenAI-style `{ choices: [{ message: { content } }] }`.
 */
export function extractModelOutput(raw: unknown): unknown {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if ('response' in record) return parseMaybeJson(record.response)
    const choices = record.choices
    if (Array.isArray(choices)) {
      const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
      return parseMaybeJson(content)
    }
  }
  return parseMaybeJson(raw)
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  // Models sometimes wrap JSON in ```json fences or add a preamble.
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(value.slice(start, end + 1))
  } catch {
    return null
  }
}

/** Workers AI error 4006: the account's daily free neuron allocation is used up. Retrying won't help. */
export function isQuotaExhausted(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('4006') || message.includes('daily free allocation')
}

interface StructuredRequest<T> {
  system: string
  user: string
  schema: z.ZodType<T>
  maxTokens: number
  temperature: number
  /**
   * Qwen's "thinking" phase. Off for simple classification: on a 30-entry
   * batch it cut latency from 48–84 s to ~26 s and neurons from ~700 to ~320
   * with the same accuracy. On (low effort) for nuanced single-entry analysis.
   */
  thinking: boolean
  /**
   * Extra acceptance check after schema validation (e.g. "covers the input").
   * Returning false triggers the retry.
   */
  accept?: (value: T) => boolean
}

export async function runStructured<T>(ai: AiBinding, request: StructuredRequest<T>): Promise<T> {
  const jsonSchema = toModelJsonSchema(request.schema)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: unknown
    try {
      raw = await ai.run(QWEN_MODEL, {
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        response_format: { type: 'json_schema', json_schema: jsonSchema },
        // Reasoning tokens are billed as output; keep them low or off.
        ...(request.thinking
          ? { reasoning_effort: 'low' }
          : { chat_template_kwargs: { enable_thinking: false } }),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      })
    } catch (error) {
      // Log the error type only: messages from the platform could echo input.
      console.error('Workers AI call failed:', error instanceof Error ? error.name : typeof error)
      if (isQuotaExhausted(error)) {
        throw new HttpError(503, 'Бесплатный дневной лимит модели исчерпан. Он обновится в 00:00 UTC (01:00 по Берлину).')
      }
      // Upstream errors (e.g. InferenceUpstreamError) are often transient.
      if (attempt < MAX_ATTEMPTS) continue
      throw new HttpError(502, 'Модель сейчас недоступна. Попробуйте чуть позже.')
    }

    const parsed = request.schema.safeParse(extractModelOutput(raw))
    if (parsed.success && (request.accept?.(parsed.data) ?? true)) return parsed.data
  }
  throw new HttpError(502, 'Модель вернула ответ в неожиданном формате. Попробуйте ещё раз.')
}
