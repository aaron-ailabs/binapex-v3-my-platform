import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init: RequestInit = {}) {
  let r: Response | undefined
  for (let i = 0; i < 5; i++) {
    const rr = await fetch(url, init)
    if (rr.ok) { r = rr; break }
    if (rr.status === 429 || rr.status === 503) { await new Promise(r => setTimeout(r, 300 + i * 200)); continue }
    r = rr; break
  }
  const ct = (r as Response).headers.get('content-type') || ''
  const body = ct.includes('application/json') ? await (r as Response).json() : await (r as Response).text()
  return { ok: (r as Response).ok, status: (r as Response).status, body }
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
