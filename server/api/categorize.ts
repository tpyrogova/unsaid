import { categorizeRequestSchema } from '../../shared/categories'
import { categorizeEntries } from '../../server/categorize'
import type { ApiHandler } from '../../server/handler'
import { json, readJson } from '../../server/http'
import { QWEN_MODEL } from '../../server/qwen'
import { requireUser } from '../../server/session'
import { assertWithinBudget, recordUsage } from '../../server/usage'

/**
 * Categorizes one batch of entries. As with analysis, texts exist only for the
 * duration of the request; the browser encrypts and stores the results.
 */
export const onRequestPost: ApiHandler = async ({ request, env }) => {
  const user = await requireUser(request, env)
  const { entries, lang } = await readJson(request, categorizeRequestSchema)
  await assertWithinBudget(env, user.id, 'categorize', entries.length)

  const results = await categorizeEntries(env.AI, entries, lang)
  await recordUsage(env, user.id, 'categorize', entries.length)

  return json({ results, meta: { model: QWEN_MODEL } })
}
