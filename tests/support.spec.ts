import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init: RequestInit = {}) {
  const r = await fetch(url, init)
  const ct = r.headers.get('content-type') || ''
  const body = ct.includes('application/json') ? await r.json() : await r.text()
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  const status = await json(`${base}/api/support/status`)
  assert.equal(status.ok, true)
  assert.ok(['online','away','offline'].includes(String(status.body.status)))

  const presenceSet = await json(`${base}/api/support/presence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'offline' }) })
  assert.equal(presenceSet.ok, true)
  assert.equal(presenceSet.body.status, 'offline')

  const session = await json(`${base}/api/support/session`, { method: 'POST' })
  assert.equal(session.ok, true)
  const sessionId = String(session.body.sessionId || '')
  assert.ok(sessionId.length > 0)

  const msg = await json(`${base}/api/support/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, text: 'human help' }) })
  assert.equal(msg.ok, true)
  assert.ok(String(msg.body.reply || '').length > 0)

  process.stdout.write('Support endpoints test completed successfully\n')
}

run().catch(e => { console.error('Test Failed:', e); process.exit(1) })
