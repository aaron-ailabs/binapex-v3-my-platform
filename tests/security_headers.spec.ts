import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function run() {
  let r: Response | undefined
  for (let i = 0; i < 5; i++) {
    const rr = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' } })
    if (rr.ok) { r = rr; break }
    if (rr.status === 429 || rr.status === 503) { await new Promise(r => setTimeout(r, 300 + i * 200)); continue }
    r = rr; break
  }
  assert.ok(r && r.ok, 'Health endpoint failed')
  const h = r.headers
  const must = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
    'permissions-policy',
    'content-security-policy'
  ]
  for (const k of must) {
    assert.ok(h.has(k), `Missing header: ${k}`)
  }
  console.log('Security headers present')
}

run().catch(e => { console.error('Test Failed:', e); process.exit(1) })
