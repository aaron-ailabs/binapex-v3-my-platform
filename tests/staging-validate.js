// Staging validation script (production mode with CSRF)
import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url, init) {
  const r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
  const t = await r.text()
  let body = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body, headers: r.headers }
}

async function run() {
  const seeded = await json(`${base}/api/demo/seed`, { method: 'POST' })
  assert.equal(seeded.ok, true)

  const csrfResp = await fetch(`${base}/api/csrf`, { headers: { Accept: 'application/json' } })
  assert.equal(csrfResp.ok, true)
  const setCookie = csrfResp.headers.get('set-cookie') || ''
  const match = /XSRF-TOKEN=([^;]+)/i.exec(setCookie)
  const csrfToken = match ? match[1] : ''
  assert.ok(csrfToken.length > 0)

  const login = await json(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ username: 'admin', password: 'password' })
  })
  assert.equal(login.ok, true)
  const token = String(login.body.token || '')
  assert.ok(token.length > 0)

  const health = await json(`${base}/api/health`)
  assert.equal(health.ok, true)
  assert.equal(health.body.status, 'ok')

  const metricsResp = await fetch(`${base}/api/metrics`)
  assert.equal(metricsResp.ok, true)

  const csrfResp2 = await fetch(`${base}/api/csrf`, { headers: { Accept: 'application/json' } })
  const setCookie2 = csrfResp2.headers.get('set-cookie') || ''
  const match2 = /XSRF-TOKEN=([^;]+)/i.exec(setCookie2)
  const csrfToken2 = match2 ? match2[1] : ''
  const cfg = await json(`${base}/api/admin/credit-score/config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-csrf-token': csrfToken2 },
    body: JSON.stringify({ decimals: 0, rounding: 'nearest' })
  })
  assert.equal(cfg.ok, true)

  const profile = await json(`${base}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(profile.ok, true)
  assert.equal(String(profile.body.id || '').length > 0, true)

  const notifications = await json(`${base}/api/notifications?unread=1`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(notifications.ok, true)
  assert.ok(Array.isArray(notifications.body))

  process.stdout.write('Staging validation passed\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
