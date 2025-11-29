import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  const key = process.env.BOOTSTRAP_KEY || 'local-bootstrap-key'
  const payload = { username: 'admin@test.local', password: 'Str0ngP@ss!Admin' }

  const first = await json(`${base}/api/admin/bootstrap`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bootstrap-Key': key }, body: JSON.stringify(payload) })
  assert.equal(first.ok, true, `first bootstrap failed: ${first.status}`)
  assert.ok(String(first.body.token || '').length > 0)

  let got429 = false
  for (let i = 0; i < 5; i++) {
    const r = await json(`${base}/api/admin/bootstrap`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bootstrap-Key': key }, body: JSON.stringify(payload) })
    if (r.status === 429) got429 = true
  }
  assert.equal(got429, false, 'rate limit triggered despite valid bootstrap key')
  process.stdout.write('Bootstrap bypass test passed\n')
}

run().catch(e => { console.error('Test Failed:', e); process.exit(1) })

