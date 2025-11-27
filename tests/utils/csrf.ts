export type CsrfContext = { cookie: string; token: string }

export async function initCsrf(base: string): Promise<CsrfContext> {
  const r = await fetch(`${base}/api/csrf`, { headers: { Accept: 'application/json' } })
  const setCookie = r.headers.get('set-cookie') || ''
  const m = /XSRF-TOKEN=([^;]+)/i.exec(setCookie)
  const token = m ? m[1] : ''
  const cookie = m ? `XSRF-TOKEN=${token}` : ''
  return { cookie, token }
}

export function withCsrf(ctx: CsrfContext, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { ...headers }
  if (ctx.token) h['X-CSRF-Token'] = ctx.token
  if (ctx.cookie) h['Cookie'] = ctx.cookie
  return h
}

export async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}
