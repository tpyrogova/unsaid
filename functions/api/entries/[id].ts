import { entryIdSchema } from '../../../shared/contract'
import { deleteEntries } from '../../../server/entries'
import type { Env } from '../../../server/env'
import { HttpError, json } from '../../../server/http'
import { requireUser } from '../../../server/session'

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env)
  const id = entryIdSchema.safeParse(params.id)
  if (!id.success) throw new HttpError(400, 'Некорректный id записи')

  await deleteEntries(env, user.id, [id.data])
  return json({ ok: true })
}
