import type { Env } from '../../../server/env'
import { json } from '../../../server/http'
import { requireUser, toAccount } from '../../../server/session'

/**
 * Current account plus its key bundle. After a page reload the browser has a
 * session cookie but no keys in memory; it uses this bundle to "unlock" with
 * the password locally, without another login round-trip.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env)
  return json(toAccount(user))
}
