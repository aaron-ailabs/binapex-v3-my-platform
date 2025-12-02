import assert from 'assert'
import { updateUserPayout, updateBulkUserPayout } from '../client/src/lib/payout'

const apiBase = 'http://localhost/api'
const token = 'test-token'

const mockFetch: typeof fetch = async (url: any, init?: any) => {
  const u = String(url)
  const body = init?.body ? JSON.parse(String(init.body)) : {}
  if (u.endsWith('/admin/users/payout')) {
    const pct = Number(body?.payoutPct ?? 0)
    return new Response(JSON.stringify({ ok: true, userId: String(body?.userId || ''), payoutPct: pct }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (u.endsWith('/admin/users/payout/bulk')) {
    const items = Array.isArray(body?.items) ? body.items : []
    return new Response(JSON.stringify({ ok: true, results: items.map((it: any) => ({ userId: it.userId, payoutPct: it.payoutPct })) }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response('{}', { status: 404 })
}

async function run() {
  const r1 = await updateUserPayout(apiBase, token, 'u_123', 87.6, 'adjust', mockFetch)
  assert.strictEqual(r1.userId, 'u_123')
  assert.strictEqual(r1.payoutPct, 88)

  const r2 = await updateUserPayout(apiBase, token, 'u_999', 123, '', mockFetch)
  assert.strictEqual(r2.payoutPct, 100)

  const bulk = await updateBulkUserPayout(apiBase, token, [
    { userId: 'a', payoutPct: 10.2 },
    { userId: 'b', payoutPct: -5 },
    { userId: 'c', payoutPct: 101 },
  ], mockFetch)
  assert.ok(bulk.ok)
  assert.strictEqual(bulk.results.length, 3)
  assert.strictEqual(bulk.results[0].payoutPct, 10)
  assert.strictEqual(bulk.results[1].payoutPct, 0)
  assert.strictEqual(bulk.results[2].payoutPct, 100)

  process.stdout.write('PAYOUT_TESTS_OK')
}

run().catch((e) => { process.stderr.write(String(e?.message || e)); process.exit(1) })
