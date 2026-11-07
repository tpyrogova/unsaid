/**
 * Worker entry point.
 *
 * Static assets (the built SPA) are served by Cloudflare before the Worker
 * runs; `run_worker_first = ["/api/*"]` in wrangler.toml sends only API
 * calls here. Routes are listed explicitly and point at framework-agnostic
 * handlers in server/api/, which are unit-tested on their own.
 */
import { Hono, type Context } from 'hono'
import { onRequestDelete as deleteAccount } from './api/account'
import { onRequestPost as analyze } from './api/analyze'
import { onRequestPost as login } from './api/auth/login'
import { onRequestPost as logout } from './api/auth/logout'
import { onRequestGet as me } from './api/auth/me'
import { onRequestPost as prelogin } from './api/auth/prelogin'
import { onRequestPost as signup } from './api/auth/signup'
import { onRequestPost as categorize } from './api/categorize'
import { onRequestDelete as deleteEntry } from './api/entries/[id]'
import {
  onRequestDelete as deleteEntries,
  onRequestGet as listEntries,
  onRequestPost as uploadEntries,
  onRequestPut as updateEntries,
} from './api/entries/index'
import { onRequestDelete as clearJournal } from './api/journal'
import type { Env } from './env'
import { runHandler, type ApiHandler } from './handler'
import { json } from './http'
import { message, requestLang } from './messages'

type AppContext = Context<{ Bindings: Env }>

/** Adapts a handler to Hono, keeping the shared error boundary. */
const handle = (handler: ApiHandler) => (c: AppContext) =>
  runHandler(handler, { request: c.req.raw, env: c.env, params: c.req.param() })

export const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.post('/auth/prelogin', handle(prelogin))
app.post('/auth/signup', handle(signup))
app.post('/auth/login', handle(login))
app.post('/auth/logout', handle(logout))
app.get('/auth/me', handle(me))

app.get('/entries', handle(listEntries))
app.post('/entries', handle(uploadEntries))
app.put('/entries', handle(updateEntries))
app.delete('/entries', handle(deleteEntries))
app.delete('/entries/:id', handle(deleteEntry))

app.post('/analyze', handle(analyze))
app.post('/categorize', handle(categorize))
app.delete('/journal', handle(clearJournal))
app.delete('/account', handle(deleteAccount))

app.notFound((c) => json({ error: message('notFound', requestLang(c.req.raw)) }, { status: 404 }))

export default {
  fetch(request, env, ctx) {
    // Normally unreachable for non-API paths (assets are served first), but
    // keeps `wrangler dev` and direct calls behaving the same.
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
