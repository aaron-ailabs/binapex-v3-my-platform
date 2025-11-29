export type CsrfContext = { cookie: string; token: string }

export async function initCsrf(base: string): Promise<CsrfContext> {
  let lastErr: any
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(`${base}/api/csrf`, { headers: { Accept: 'application/json' } })
      if (r.ok) {
        const setCookie = r.headers.get('set-cookie') || ''
        const m = /XSRF-TOKEN=([^;]+)/i.exec(setCookie)
        const token = m ? m[1] : ''
        const cookie = m ? `XSRF-TOKEN=${token}` : ''
        return { cookie, token }
      }
      if (r.status === 429 || r.status === 503) { await new Promise(r => setTimeout(r, 300 + i * 200)) }
      else { break }
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 300 + i * 200)) }
  }
  throw lastErr || new Error('Failed to init CSRF')
}

export function withCsrf(ctx: CsrfContext, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { ...headers }
  if (ctx.token) h['X-CSRF-Token'] = ctx.token
  if (ctx.cookie) h['Cookie'] = ctx.cookie
  return h
}

export async function json(url: string, init?: RequestInit) {
  let r: Response | undefined
  for (let i = 0; i < 5; i++) {
    r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
    if (r.ok) break
    if (r.status === 429 || r.status === 503) { await new Promise(r => setTimeout(r, 300 + i * 200)); continue }
    break
  }
  const t = await (r as Response).text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: (r as Response).ok, status: (r as Response).status, body }
}
