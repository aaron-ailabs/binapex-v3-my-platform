
export type UpdateResult = { userId: string; payoutPct: number }

export async function updateUserPayout(apiBase: string, token: string, userId: string, payoutPct: number, reason?: string, fetchImpl?: typeof fetch): Promise<UpdateResult> {
  const pct = Math.round(Math.max(0, Math.min(100, Number(payoutPct || 0))))
  const url = `${apiBase}/admin/users/payout`
  const body = { userId, payoutPct: pct, reason }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const f = fetchImpl || fetch
  const res = await f(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  let data: any = null
  try { data = await res.json() } catch {}
  const val = typeof data?.payoutPct === 'number' ? Number(data.payoutPct) : pct
  return { userId, payoutPct: val }
}

export async function updateBulkUserPayout(apiBase: string, token: string, items: { userId: string; payoutPct: number; reason?: string }[], fetchImpl?: typeof fetch): Promise<{ ok: boolean; results: UpdateResult[] }> {
  const url = `${apiBase}/admin/users/payout/bulk`
  const payload = { items: items.map(it => ({ userId: it.userId, payoutPct: Math.round(Math.max(0, Math.min(100, Number(it.payoutPct || 0)))), reason: it.reason || '' })) }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const f = fetchImpl || fetch
  const res = await f(url, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  let data: any = null
  try { data = await res.json() } catch {}
  const results = Array.isArray(data?.results) ? data.results.map((r: any) => ({ userId: String(r.userId || ''), payoutPct: Number(r.payoutPct || 0) })) : []
  return { ok: true, results }
}
