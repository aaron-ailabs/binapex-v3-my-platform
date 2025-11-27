import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function run() {
  const r = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' } })
  assert.equal(r.ok, true, 'Health endpoint failed')
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
